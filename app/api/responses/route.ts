import { NextResponse } from "next/server";

import {
  calculateScores,
  LEARNING_QUESTION_IDS,
  PRESSURE_QUESTION_IDS,
  scoresToFlat,
} from "@/lib/survey-data";
import { prisma } from "@/lib/prisma";

// ========== 数据库可用性检测 ==========
// 在 Vercel serverless 环境下：
// 1) SQLite 无法持久化（每次请求都是全新临时环境）
// 2) 可能尚未执行 prisma migrate，表不存在
// 这里尝试一次探测性查询，失败后走"降级模式"——至少不让用户看到报错。

let _dbUsable: boolean | null = null;

async function isDatabaseUsable(): Promise<boolean> {
  if (_dbUsable !== null) return _dbUsable;
  try {
    // 用最简单的探测查询判断数据库是否可用 + schema 是否已迁移
    await prisma.$queryRaw`SELECT 1`;
    // 探测 Student 表是否存在
    await prisma.student.count();
    _dbUsable = true;
  } catch (err) {
    console.warn("[api/responses] 数据库不可用，进入降级模式：", err);
    _dbUsable = false;
  }
  return _dbUsable;
}

export async function GET() {
  try {
    const usable = await isDatabaseUsable();
    if (!usable) {
      return NextResponse.json(
        {
          records: [],
          _dbFallback: true,
          _message:
            "数据库尚未配置。请在 Vercel 上设置 DATABASE_URL（建议使用 Vercel Postgres / Neon / Supabase）并执行 prisma migrate deploy。",
        },
        { status: 200 }
      );
    }

    const responses = await prisma.response.findMany({
      include: { student: true },
      orderBy: { createdAt: "desc" },
    });

    const records = responses.map((response) => {
      const learningFlat: Record<string, unknown> = (() => {
        try {
          return JSON.parse(response.learningScores);
        } catch {
          return {};
        }
      })();
      const stressFlat: Record<string, unknown> = (() => {
        try {
          return JSON.parse(response.stressScores);
        } catch {
          return {};
        }
      })();

      const scores: Record<string, unknown> = {
        ...learningFlat,
        ...stressFlat,
      };

      return {
        id: response.id,
        name: response.student.name,
        age: response.student.age,
        school: response.student.school,
        gender: response.student.gender,
        createdAt: response.createdAt.toISOString(),
        scores,
      };
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Failed to fetch responses:", error);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      age,
      school,
      gender,
      learningAnswers,
      stressAnswers,
    } = body as {
      name?: string;
      age?: number | null;
      school?: string;
      gender?: string;
      learningAnswers?: Record<string, number>;
      stressAnswers?: Record<string, number>;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "请填写姓名" }, { status: 400 });
    }

    if (!learningAnswers || Object.keys(learningAnswers).length === 0) {
      return NextResponse.json(
        { error: "请完成学习力测评" },
        { status: 400 }
      );
    }
    if (!stressAnswers || Object.keys(stressAnswers).length === 0) {
      return NextResponse.json(
        { error: "请完成学业压力测评" },
        { status: 400 }
      );
    }

    const missingLearning = LEARNING_QUESTION_IDS.filter(
      (id) => learningAnswers[String(id)] === undefined
    );
    if (missingLearning.length > 0) {
      return NextResponse.json(
        {
          error: `学习力测评还有 ${missingLearning.length} 道题目未作答`,
          missingType: "learning",
          missingIds: missingLearning,
        },
        { status: 400 }
      );
    }

    const missingStress = PRESSURE_QUESTION_IDS.filter(
      (id) => stressAnswers[String(id)] === undefined
    );
    if (missingStress.length > 0) {
      return NextResponse.json(
        {
          error: `学业压力测评还有 ${missingStress.length} 道题目未作答`,
          missingType: "stress",
          missingIds: missingStress,
        },
        { status: 400 }
      );
    }

    const scores = calculateScores(learningAnswers, stressAnswers);
    const usable = await isDatabaseUsable();

    // ===== 数据库不可用时：降级模式，返回成功但不持久化 =====
    // 这样前端不会报错，用户能正常看到"测评完成"页
    if (!usable) {
      console.warn(
        "[api/responses] 数据库未配置，以降级模式响应——测评未持久化。",
        "请在 Vercel 上设置 DATABASE_URL 并执行 prisma migrate deploy。"
      );
      return NextResponse.json({
        id: "temp-" + Date.now().toString(36),
        scores,
        _dbFallback: true,
        _message:
          "测评成功，但数据库未配置，数据未持久化。请联系管理员在 Vercel 上配置 DATABASE_URL。",
      });
    }

    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        age: typeof age === "number" && !Number.isNaN(age) ? age : null,
        school: school?.trim() || null,
        gender: gender?.trim() || null,
      },
    });

    const response = await prisma.response.create({
      data: {
        studentId: student.id,
        learningAnswers: JSON.stringify(learningAnswers),
        stressAnswers: JSON.stringify(stressAnswers),
        learningScores: JSON.stringify(
          scoresToFlat({
            percent: scores.percent,
            average10: scores.average10,
            pressure: {} as never,
            mindsetLabel: scores.mindsetLabel,
          })
        ),
        stressScores: JSON.stringify(
          Object.fromEntries(
            Object.entries(scores.pressure).map(([k, v]) => [
              `学业压力_${k}`,
              v,
            ])
          )
        ),
      },
    });

    return NextResponse.json({
      id: response.id,
      scores,
    });
  } catch (error) {
    // Vercel serverless 下常见错误：
    // - "no such table: Student" （未执行 prisma migrate deploy）
    // - SQLite 临时环境写失败
    console.error("Failed to save response:", error);
    return NextResponse.json(
      { error: "提交失败，请稍后重试" },
      { status: 500 }
    );
  }
}
