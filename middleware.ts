import { NextResponse, type NextRequest } from "next/server";

// "/" must ALWAYS be the marketing landing, and "/app" the product. A stale CDN/build
// cache once pinned an old prerender of "/" (it served the dashboard). This rewrite
// resolves "/" to the /home route at REQUEST time — middleware runs before any cached
// page, so the landing can never be shadowed by a stale prerender again.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
