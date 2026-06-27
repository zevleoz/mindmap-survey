import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const isFamilyDomain =
    host.startsWith("family.") ||
    host.startsWith("family.") ||
    host.includes("family.");

  if (isFamilyDomain) {
    const path = request.nextUrl.pathname;
    if (path === "/" || path === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/family";
      return NextResponse.rewrite(url);
    }
    if (path.startsWith("/family")) {
      return NextResponse.next();
    }
    if (
      path.startsWith("/api/") ||
      path.startsWith("/_next/") ||
      path.startsWith("/branding/") ||
      path === "/favicon.ico"
    ) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = `/family${path}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
