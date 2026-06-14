import { NextResponse } from "next/server";

import {
  calculateScores,
  LEARNING_QUESTION_IDS,
  PRESSURE_QUESTION_IDS,
  scoresToFlat,
} from "@/lib/survey-data";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
    console.error("Failed to save response:", error);
    return NextResponse.json(
      { error: "提交失败，请稍后重试" },
      { status: 500 }
    );
  }
}
