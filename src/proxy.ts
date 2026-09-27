import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  // Validating here also renews the session cookie, which Server Components cannot set.
  const { headers, response: session } = await auth.api.getSession({
    headers: request.headers,
    returnHeaders: true,
  });
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  const response = NextResponse.next();
  for (const cookie of headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

export const config = {
  matcher: [
    // Every route requires a session except auth pages, the auth API, and static assets.
    "/((?!auth/|api/auth/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
