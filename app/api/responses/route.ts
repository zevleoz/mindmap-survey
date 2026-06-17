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

// 将 { "1": 5 ... } 的部分答案转成 { q1: 5 } 的数据库列对象，仅包含传入题号
function partialAnswersToColumns(
  learningAnswers: Record<string, number> | undefined | null,
  pressureAnswers: Record<string, number> | undefined | null
): Record<string, number> {
  const cols: Record<string, number> = {};
  if (learningAnswers) {
    for (const id of LEARNING_QUESTION_IDS) {
      const v = learningAnswers[String(id)];
      if (typeof v === "number") cols[`q${id}`] = v;
    }
  }
  if (pressureAnswers) {
    for (const id of PRESSURE_QUESTION_IDS) {
      const v = pressureAnswers[String(id)];
      if (typeof v === "number") cols[`q${60 + id}`] = v;
    }
  }
  return cols;
}

function safeParseJSON<T>(text: string | null | undefined): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ========== GET（保留原有行为） ==========
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

      let percent: Record<string, number> = {};
      let pressure: Record<string, number> = {};
      let mindsetLabel: string | null = r.mindsetLabel;

      const parsedDim = safeParseJSON<Record<string, number>>(r.dimensionScores);
      const parsedPressure = safeParseJSON<Record<string, number>>(r.pressureScores);

      if (parsedDim && Object.keys(parsedDim).length > 0) {
        percent = parsedDim;
      } else {
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

// ========== POST：最终提交（含 upsert） ==========
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentId,
      name,
      age,
      school,
      gender,
      learningAnswers,
      pressureAnswers,
    } = body as {
      studentId?: string | null;
      name?: string;
      age?: number | null;
      school?: string;
      gender?: string;
      learningAnswers?: Record<string, number>;
      pressureAnswers?: Record<string, number>;
    };

    if (!name?.trim() && !studentId) {
      return NextResponse.json({ error: "请填写姓名" }, { status: 400 });
    }
    if (!learningAnswers || Object.keys(learningAnswers).length === 0) {
      return NextResponse.json({ error: "请完成学习力测评" }, { status: 400 });
    }
    if (!pressureAnswers || Object.keys(pressureAnswers).length === 0) {
      return NextResponse.json({ error: "请完成学业压力测评" }, { status: 400 });
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

    // 数据库不可用时：降级模式
    if (!usable) {
      console.warn(
        "[api/responses] 数据库未配置，以降级模式响应——测评未持久化。",
        "请在 Vercel 上配置 DATABASE_URL 并执行 prisma migrate deploy。"
      );
      return NextResponse.json({
        id: "temp-" + Date.now().toString(36),
        scores,
        _dbFallback: true,
        _message: "测评成功，但数据库未配置，数据未持久化。",
      });
    }

    // 维度得分扁平化保存
    const flatScores = scoresToFlat(scores);
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

    // 决定 studentId：传入优先；否则创建新 student 行
    let finalStudentId: string;
    if (studentId && !studentId.startsWith("temp-")) {
      finalStudentId = studentId;
      // 如果传入的 studentId 不存在则创建一个新学生
      const existing = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true },
      });
      if (!existing) {
        const created = await prisma.student.create({
          data: {
            id: studentId,
            name: name?.trim() || "未填写",
            age: typeof age === "number" && !Number.isNaN(age) ? age : null,
            school: school?.trim() || null,
            gender: gender?.trim() || null,
          },
        });
        finalStudentId = created.id;
      } else {
        // 若学生存在，顺便更新基本信息（以提交时为准）
        await prisma.student.update({
          where: { id: studentId },
          data: {
            name: name?.trim() || undefined,
            age: typeof age === "number" && !Number.isNaN(age) ? age : undefined,
            school: school?.trim() || undefined,
            gender: gender?.trim() || undefined,
          },
        });
      }
    } else {
      const created = await prisma.student.create({
        data: {
          name: name?.trim() || "未填写",
          age: typeof age === "number" && !Number.isNaN(age) ? age : null,
          school: school?.trim() || null,
          gender: gender?.trim() || null,
        },
      });
      finalStudentId = created.id;
    }

    // upsert：同一 studentId 下只有一条 response 记录
    const existingResponse = await prisma.response.findFirst({
      where: { studentId: finalStudentId },
      select: { id: true },
    });

    let responseId: string;
    if (existingResponse) {
      await prisma.response.update({
        where: { id: existingResponse.id },
        data: {
          isDraft: false,
          dimensionScores: JSON.stringify(dimNumeric),
          pressureScores: JSON.stringify(pressureNumeric),
          mindsetLabel: scores.mindsetLabel,
          ...columns,
        },
      });
      responseId = existingResponse.id;
    } else {
      const created = await prisma.response.create({
        data: {
          studentId: finalStudentId,
          isDraft: false,
          dimensionScores: JSON.stringify(dimNumeric),
          pressureScores: JSON.stringify(pressureNumeric),
          mindsetLabel: scores.mindsetLabel,
          ...columns,
        },
      });
      responseId = created.id;
    }

    return NextResponse.json({ id: responseId, studentId: finalStudentId, scores });
  } catch (error) {
    console.error("Failed to save response:", error);
    return NextResponse.json(
      { error: "提交失败，请稍后重试" },
      { status: 500 }
    );
  }
}

// ========== PATCH：自动保存（部分答案，不要求完整） ==========
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      studentId,
      studentInfo,
      learningAnswers,
      pressureAnswers,
      pageIndex,
      section,
    } = body as {
      studentId?: string | null;
      studentInfo?: { name?: string; age?: number | null; school?: string; gender?: string } | null;
      learningAnswers?: Record<string, number> | null;
      pressureAnswers?: Record<string, number> | null;
      pageIndex?: number | null;
      section?: "learning" | "stress" | null;
    };

    if (!studentId) {
      return NextResponse.json(
        { error: "缺少 studentId" },
        { status: 400 }
      );
    }

    const usable = await isDatabaseUsable();
    if (!usable) {
      return NextResponse.json(
        { ok: true, _dbFallback: true, note: "数据库未配置，已忽略服务端自动保存" },
        { status: 200 }
      );
    }

    // 解析要写入的列（只覆盖传入的题号，不碰其他列）
    const columns = partialAnswersToColumns(learningAnswers, pressureAnswers);
    const hasColumns = Object.keys(columns).length > 0;

    // 如果是 temp- 开头的本地临时 id，就为他创建一个真正的学生记录
    let finalStudentId: string;
    if (studentId.startsWith("temp-")) {
      const student = await prisma.student.create({
        data: {
          name: studentInfo?.name?.trim() || "未填写",
          age:
            typeof studentInfo?.age === "number" && !Number.isNaN(studentInfo.age)
              ? studentInfo.age
              : null,
          school: studentInfo?.school?.trim() || null,
          gender: studentInfo?.gender?.trim() || null,
        },
      });
      finalStudentId = student.id;
    } else {
      const existing = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true },
      });
      if (existing) {
        finalStudentId = studentId;
        if (studentInfo) {
          await prisma.student.update({
            where: { id: studentId },
            data: {
              name: studentInfo.name?.trim() || undefined,
              age:
                typeof studentInfo.age === "number" && !Number.isNaN(studentInfo.age)
                  ? studentInfo.age
                  : undefined,
              school: studentInfo.school?.trim() || undefined,
              gender: studentInfo.gender?.trim() || undefined,
            },
          });
        }
      } else {
        const student = await prisma.student.create({
          data: {
            id: studentId,
            name: studentInfo?.name?.trim() || "未填写",
            age:
              typeof studentInfo?.age === "number" && !Number.isNaN(studentInfo.age)
                ? studentInfo.age
                : null,
            school: studentInfo?.school?.trim() || null,
            gender: studentInfo?.gender?.trim() || null,
          },
        });
        finalStudentId = student.id;
      }
    }

    const existingResponse = await prisma.response.findFirst({
      where: { studentId: finalStudentId },
      select: { id: true },
    });

    if (existingResponse) {
      if (hasColumns) {
        await prisma.response.update({
          where: { id: existingResponse.id },
          data: { ...columns },
        });
      }
      return NextResponse.json({
        ok: true,
        id: existingResponse.id,
        studentId: finalStudentId,
        section,
        pageIndex,
      });
    }

    // 还没有 response：创建一个草稿记录（isDraft: true），并写入当前已知的题分
    const created = await prisma.response.create({
      data: {
        studentId: finalStudentId,
        isDraft: true,
        ...columns,
      },
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      studentId: finalStudentId,
      isNewDraft: true,
      section,
      pageIndex,
    });
  } catch (error) {
    console.error("Failed to auto-save:", error);
    return NextResponse.json(
      { error: "自动保存失败" },
      { status: 500 }
    );
  }
}
