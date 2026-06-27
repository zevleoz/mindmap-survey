import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  
  if (host.startsWith("family.")) {
    if (request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/family", request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};