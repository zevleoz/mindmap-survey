import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 简易管理密码验证：密码从环境变量 ADMIN_PASSWORD 读取，
// 若未设置则不允许登录（防止意外泄露）。
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = body.password;

    const serverPassword = process.env.ADMIN_PASSWORD;
    if (!serverPassword) {
      return NextResponse.json(
        { success: false, error: "服务端未配置管理员密码" },
        { status: 500 }
      );
    }

    const ok =
      typeof password === "string" &&
      password.length > 0 &&
      password === serverPassword;

    if (!ok) {
      return NextResponse.json(
        { success: false, error: "密码错误" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin auth failed:", error);
    return NextResponse.json(
      { success: false, error: "验证失败，请稍后重试" },
      { status: 500 }
    );
  }
}
