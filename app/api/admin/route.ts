import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin 列表接口：返回所有学生 + 每条的测评记录（含基本信息）
 * 在 Vercel serverless 环境下，如果数据库未配置，
 * 返回空列表并带上 _dbFallback 标志，供前端提示。
 */
export async function GET() {
  try {
    // ===== 数据库可用性探测 =====
    let usable = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.student.count();
      usable = true;
    } catch (err) {
      console.warn("[api/admin] 数据库不可用：", err);
      usable = false;
    }

    if (!usable) {
      return NextResponse.json(
        {
          students: [],
          _dbFallback: true,
          _message:
            "数据库未配置（Vercel serverless 下 SQLite 无法持久化）。请在 Vercel 项目设置 Environment Variables 中添加 DATABASE_URL（建议使用 Vercel Postgres / Neon / Supabase），然后在 Vercel CLI 或本地执行 `prisma migrate deploy` 迁移 schema。",
        },
        { status: 200 }
      );
    }

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
      { error: "获取数据失败：" + (error as Error).message },
      { status: 500 }
    );
  }
}
