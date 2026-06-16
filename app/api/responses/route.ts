import { NextResponse } from "next/server";

import {
  DIMENSIONS,
  PRESSURE_DIMENSIONS,
  calculateScores,
  LEARNING_QUESTION_IDS,
  PRESSURE_QUESTION_IDS,
  scoresToFlat,
} from "@/lib/survey-data";
import { prisma, isDatabaseUsable } from "@/lib/prisma";

// 将 { "1": 5, "2": 3, ... } 转成 { q1: 5, q2: 3, ... } 对象
function answersToColumns(
  learningAnswers: Record<string, number>,
  pressureAnswers: Record<string, number>
): Record<string, number | undefined> {
  const cols: Record<string, number | undefined> = {};
  for (const id of LEARNING_QUESTION_IDS) {
    cols[`q${id}`] = learningAnswers[String(id)];
  }
  for (const id of PRESSURE_QUESTION_IDS) {
    // 学业压力的题号从 q61 开始
    cols[`q${60 + id}`] = pressureAnswers[String(id)];
  }
  return cols;
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

    const records = responses.map((r) => {
      const raw: Record<string, number | undefined> = {};
      for (let i = 1; i <= 90; i++) {
        const key = `q${i}` as keyof typeof r;
        const v = r[key];
        if (typeof v === "number") raw[key] = v;
      }

      // 维度得分：优先使用存储的 JSON（更稳定）；若缺失则用 q1..q90 实时计算
      let percent: Record<string, number> = {};
      let pressure: Record<string, number> = {};
      let mindsetLabel: string | null = r.mindsetLabel;

      const parsedDim = safeParseJSON<Record<string, number>>(r.dimensionScores);
      const parsedPressure = safeParseJSON<Record<string, number>>(r.pressureScores);

      if (parsedDim && Object.keys(parsedDim).length > 0) {
        percent = parsedDim;
      } else {
        // 若数据库中没有维度得分，则通过 q1..q90 重算一次（向后兼容）
        const learningAnswers: Record<string, number> = {};
        const pressureAnswers: Record<string, number> = {};
        for (let i = 1; i <= 60; i++) {
          const v = raw[`q${i}`];
          if (typeof v === "number") learningAnswers[String(i)] = v;
        }
        for (let i = 61; i <= 90; i++) {
          const v = raw[`q${i}`];
          if (typeof v === "number") pressureAnswers[String(i - 60)] = v;
        }
        const scores = calculateScores(learningAnswers, pressureAnswers);
        percent = scores.percent as Record<string, number>;
        pressure = scores.pressure as Record<string, number>;
        mindsetLabel = scores.mindsetLabel;
      }
      if (parsedPressure && Object.keys(parsedPressure).length > 0) {
        pressure = parsedPressure;
      }

      return {
        id: r.id,
        name: r.student.name,
        age: r.student.age,
        school: r.student.school,
        gender: r.student.gender,
        createdAt: r.createdAt.toISOString(),
        answers: raw,
        percent,
        pressure,
        mindsetLabel,
      };
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Failed to fetch responses:", error);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}

function safeParseJSON<T>(text: string | null | undefined): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
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
      pressureAnswers,
    } = body as {
      name?: string;
      age?: number | null;
      school?: string;
      gender?: string;
      learningAnswers?: Record<string, number>;
      pressureAnswers?: Record<string, number>;
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
    if (!pressureAnswers || Object.keys(pressureAnswers).length === 0) {
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
      (id) => pressureAnswers[String(id)] === undefined
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

    const scores = calculateScores(learningAnswers, pressureAnswers);
    const usable = await isDatabaseUsable();

    // ===== 数据库不可用时：降级模式，返回成功但不持久化 =====
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

    // 维度得分扁平化保存（便于 Admin 面板直接使用）
    const flatScores = scoresToFlat(scores);
    // 过滤出数值字段（percent/压力维度），去掉 mindsetLabel 这种字符串
    const dimNumeric: Record<string, number> = {};
    for (const d of DIMENSIONS) {
      const v = (flatScores as Record<string, number | string>)[d];
      if (typeof v === "number") dimNumeric[d] = Math.round(v * 10) / 10;
    }
    const pressureNumeric: Record<string, number> = {};
    for (const d of PRESSURE_DIMENSIONS) {
      const key = `学业压力_${d}`;
      const v = (flatScores as Record<string, number | string>)[key];
      if (typeof v === "number") pressureNumeric[d] = v;
    }

    const columns = answersToColumns(learningAnswers, pressureAnswers);

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
        dimensionScores: JSON.stringify(dimNumeric),
        pressureScores: JSON.stringify(pressureNumeric),
        mindsetLabel: scores.mindsetLabel,
        ...columns,
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
