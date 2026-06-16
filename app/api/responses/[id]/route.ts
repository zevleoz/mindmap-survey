import { NextResponse } from "next/server";

import {
  DIMENSIONS,
  PRESSURE_DIMENSIONS,
  calculateScores,
} from "@/lib/survey-data";
import { prisma, isDatabaseUsable } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "缺少报告编号" },
        { status: 400 }
      );
    }

    const usable = await isDatabaseUsable();
    if (!usable) {
      return NextResponse.json(
        {
          error:
            "数据库尚未配置，无法查询单条测评记录。请配置 DATABASE_URL 并执行 `npx prisma migrate deploy`。",
        },
        { status: 503 }
      );
    }

    const response = await prisma.response.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!response) {
      return NextResponse.json(
        { error: "未找到该测评记录" },
        { status: 404 }
      );
    }

    // 原始 q1..q90 分数
    const raw: Record<string, number | undefined> = {};
    for (let i = 1; i <= 90; i++) {
      const key = `q${i}` as keyof typeof response;
      const v = response[key];
      if (typeof v === "number") raw[key] = v;
    }

    // 维度得分：优先使用存储的 JSON；若缺失则基于 q1..q90 重算
    let percent: Record<string, number> = {};
    let pressure: Record<string, number> = {};
    let mindsetLabel: string | null = response.mindsetLabel ?? null;

    const dim =
      (response as unknown as { dimensionScores?: string | null })
        .dimensionScores ?? null;
    const pres =
      (response as unknown as { pressureScores?: string | null })
        .pressureScores ?? null;

    if (dim) {
      try {
        const v = JSON.parse(dim);
        if (v && typeof v === "object") {
          for (const d of DIMENSIONS) {
            const n = (v as Record<string, unknown>)[d];
            if (typeof n === "number") percent[d] = n;
          }
        }
      } catch {
        // 忽略
      }
    }
    if (pres) {
      try {
        const v = JSON.parse(pres);
        if (v && typeof v === "object") {
          for (const d of PRESSURE_DIMENSIONS) {
            const n = (v as Record<string, unknown>)[d];
            if (typeof n === "number") pressure[d] = n;
          }
        }
      } catch {
        // 忽略
      }
    }

    if (Object.keys(percent).length === 0) {
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

    return NextResponse.json({
      id: response.id,
      name: response.student.name,
      age: response.student.age,
      school: response.student.school,
      gender: response.student.gender,
      createdAt: response.createdAt.toISOString(),
      answers: raw,
      percent,
      pressure,
      mindsetLabel,
    });
  } catch (error) {
    console.error("Failed to fetch response detail:", error);
    return NextResponse.json(
      { error: "获取报告失败，请稍后重试" },
      { status: 500 }
    );
  }
}
