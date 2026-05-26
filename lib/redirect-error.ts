/**
 * Next.js `redirect()` 와 `notFound()` 는 control-flow를 위한 특수 Error를 throw한다.
 * Server Action 호출부의 try/catch 가 이를 swallow 하면 navigation 이 막히므로
 * catch 안에서 가장 먼저 rethrow 해야 한다.
 *
 * `next/navigation` 은 16에서 `isRedirectError` 를 public export 하지 않으므로
 * digest 문자열을 직접 검사한다. (`unstable_rethrow` 는 stable 이 될 때까지 보류.)
 *
 * Usage:
 * ```ts
 * try { await serverAction(); }
 * catch (e) {
 *   if (isRedirectError(e)) throw e;
 *   toast.error(...);
 * }
 * ```
 */
export function isRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
