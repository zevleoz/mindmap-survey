import { NextResponse } from "next/server";

import { prisma, isDatabaseUsable } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, age, school, gender } = body as {
      name?: string;
      age?: number | null;
      school?: string;
      gender?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "请填写姓名" }, { status: 400 });
    }

    const usable = await isDatabaseUsable();
    if (!usable) {
      // 数据库未配置：返回一个临时 id，前端继续走"本地保存"路径
      return NextResponse.json({
        id: "temp-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
        name: name.trim(),
        _dbFallback: true,
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

    return NextResponse.json({ id: student.id, name: student.name });
  } catch (error) {
    console.error("Failed to create student:", error);
    return NextResponse.json(
      { error: "暂时无法创建学生记录，请稍后再试" },
      { status: 500 }
    );
  }
}
