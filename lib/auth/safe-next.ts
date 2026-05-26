/**
 * OAuth callback 등 사용자 제어 query param을 next.js `redirect()`에 넘길 때 open-redirect 방지.
 * Next의 redirect()는 절대 URL(`https://...`)과 scheme-relative URL(`//foo.com/x`)을 외부 도메인으로 보낸다.
 * same-origin 절대 경로(`/...`)만 허용하고 그 외는 fallback으로 강제.
 *
 * 예:
 * - `/my-events` → `/my-events`
 * - `https://evil.com/x` → fallback
 * - `//evil.com/x` → fallback (scheme-relative)
 * - `` `null` ` → fallback
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback: string = "/",
): string {
  if (!raw) return fallback;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return fallback;
}
