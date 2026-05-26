import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

/** 비로그인 사용자도 접근 가능한 경로 — admin 경로는 별도 분기. */
const WHITELIST = [
  "/",
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/error",
  "/auth/forgot-password",
  "/auth/sign-up",
  "/auth/sign-up-success",
  "/auth/update-password",
  "/admin/login",
];

/**
 * Next.js middleware proxy — Supabase session refresh + 비로그인 redirect.
 * admin role 검증은 `app/admin/(authed)/layout.tsx`의 server guard에서 수행.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // 인증 가드: 비로그인 사용자 redirect (whitelist 외).
  // - `/invite/[code]`는 비로그인 OK (Phase 1 spec §6).
  // - admin 경로는 `/admin/login`으로, 나머지는 `/auth/login`으로 redirect.
  const path = request.nextUrl.pathname;
  const isWhitelisted = WHITELIST.includes(path) || path.startsWith("/invite/");

  if (!user && !isWhitelisted) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = path.startsWith("/admin") ? "/admin/login" : "/auth/login";
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
