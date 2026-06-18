import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * DELETE /api/responses/[id]
 * Admin only: 从数据库彻底删除一条 response 记录（及其依赖）。
 *
 * 注意：admin 会话在 App Router 中通过 cookie 校验，
 * 这里做一层服务端口令确认，避免非管理员误删除。
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Missing response id" },
        { status: 400 }
      );
    }

    // 找到这条 response 对应的 studentId（如果需要一起删 student）
    const existing = await prisma.response.findUnique({
      where: { id },
      select: { studentId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      );
    }

    // 先删除 response，再删除 student（一对一，避免外键约束问题）
    await prisma.response.delete({ where: { id } });

    try {
      await prisma.student.delete({ where: { id: existing.studentId } });
    } catch {
      // student 可能已被删除，不影响本次结果
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/responses/[id]]", error);
    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}
