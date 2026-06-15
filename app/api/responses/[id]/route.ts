import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 解析数据库里存的两个 JSON 字符串：
 *   learningScores = { [Dimension]: percent, mindsetLabel: string }
 *   stressScores   = { 学业压力_[PressureDimension]: number, ... }
 * 返回 SurveyScores 格式：{ average10, percent, pressure, mindsetLabel }
 */
function parseScores(learningScores: string, pressureScores: string) {
  let percent: Record<string, number> = {};
  let average10: Record<string, number> = {};
  let mindsetLabel = "成长型思维";
  try {
    const obj = JSON.parse(learningScores || "{}");
    if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        if (k === "mindsetLabel") continue;
        if (typeof v === "number") {
          percent[k] = v;
          // percent = average10 * 100，反向推导
          average10[k] = Math.round((v / 10) * 10) / 10;
        }
      }
      if (typeof obj.mindsetLabel === "string") mindsetLabel = obj.mindsetLabel;
    }
  } catch {
    percent = {};
    average10 = {};
  }

  let pressure: Record<string, number> = {};
  try {
    const obj = JSON.parse(pressureScores || "{}");
    if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        const key = k.startsWith("学业压力_") ? k.slice(5) : k;
        if (typeof v === "number") pressure[key] = v;
      }
    }
  } catch {
    pressure = {};
  }

  return { average10, percent, pressure, mindsetLabel };
}

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

    const response = await prisma.response.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!response) {
      return NextResponse.json(
        { error: "未找到该报告" },
        { status: 404 }
      );
    }

    const { average10, percent, pressure, mindsetLabel } = parseScores(
      response.learningScores,
      response.stressScores
    );

    return NextResponse.json({
      id: response.id,
      name: response.student.name,
      age: response.student.age,
      school: response.student.school,
      gender: response.student.gender,
      createdAt: response.createdAt.toISOString(),
      scores: {
        average10,
        percent,
        pressure,
        mindsetLabel,
      },
    });
  } catch (error) {
    console.error("Failed to fetch response:", error);
    return NextResponse.json(
      { error: "获取报告失败，请稍后重试" },
      { status: 500 }
    );
  }
}
