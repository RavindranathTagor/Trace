import { NextResponse, type NextRequest } from "next/server";

// "/" must always be the marketing landing, and "/app" the product. A stale CDN entry
// had pinned an old prerender of "/" (it kept serving the dashboard). This rewrite
// resolves "/" to the fresh /home route at REQUEST time — middleware runs on the server
// before a page is served, and /home was never cached, so the landing always wins.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
