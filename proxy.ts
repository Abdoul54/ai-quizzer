import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_ROUTES = ["/login", "/register"];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
    if (isPublic) return NextResponse.next();

    const session = getSessionCookie(request);

    console.log({ session });

    if (!session) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth pages
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - _next/static  (Next.js build assets)
         * - _next/image   (Next.js image optimization)
         * - favicon.ico, robots.txt, sitemap.xml
         * - /api/auth/**  (Better Auth endpoints — must stay open)
         * - Public files with extensions (e.g. .png, .svg, .ico)
         */
        "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
    ],
};