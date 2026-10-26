import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          list: {
            name: string;
            value: string;
            options?: {
              domain?: string;
              encode?: (value: string) => string;
              expires?: Date;
              httpOnly?: boolean;
              maxAge?: number;
              path?: string;
              sameSite?: boolean | "lax" | "strict" | "none";
              secure?: boolean;
            };
          }[]
        ) => {
          list.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          response = NextResponse.next({ request });

          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && path.startsWith("/api")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const isPublic =
    path === "/" || path.startsWith("/login");

  if (!user && !isPublic) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  if (user && path.startsWith("/login")) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};