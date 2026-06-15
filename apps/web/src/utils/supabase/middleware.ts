import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: { [key: string]: unknown } }[]
        ) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, {
              httpOnly: true,
              secure: true,
              sameSite: "lax",
              ...options,
            } as never);
          }
          supabaseResponse = NextResponse.next({ request });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/doctor/login";
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname === "/doctor/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
