import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isAdminUser } from "@/lib/admin/roles";

function withAuthCookies(
  from: NextResponse,
  to: NextResponse
): NextResponse {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
  return to;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const { user, response } = await updateSession(req);

  if (pathname === "/admin/login") {
    if (isAdminUser(user)) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return withAuthCookies(response, NextResponse.redirect(url));
    }
    return response;
  }

  if (!isAdminUser(user)) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return withAuthCookies(response, NextResponse.redirect(url));
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
