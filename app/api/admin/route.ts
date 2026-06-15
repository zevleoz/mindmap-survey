import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin 列表接口：返回所有学生 + 每条的测评记录（含基本信息）
 * 供管理后台页面展示列表使用。
 */
export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: { responses: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });

    const rows = students.map((s) => ({
      id: s.id,
      name: s.name,
      age: s.age,
      school: s.school,
      gender: s.gender,
      createdAt: s.createdAt.toISOString(),
      responses: s.responses.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({ students: rows });
  } catch (error) {
    console.error("Admin API error:", error);
    return NextResponse.json(
      { error: "获取数据失败，请稍后重试" },
      { status: 500 }
    );
  }
}
