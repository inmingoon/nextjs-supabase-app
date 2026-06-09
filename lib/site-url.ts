/**
 * 배포 환경별 canonical origin.
 * OG 절대경로(metadataBase) · robots · sitemap 에서 공용 사용.
 * 우선순위: 명시 SITE_URL > Vercel production 고정 도메인 > Vercel 배포별 URL > localhost.
 * VERCEL_URL 만 쓰면 preview 마다 도메인이 바뀌어 OG 절대경로가 깨질 수 있어 production 우선.
 * 값은 scheme 포함 절대 URL 이어야 함 — metadataBase 의 `new URL()` 평가 시점에 검증된다.
 */
const rawSiteUrl =
  // `||` (truthy) — 빈 문자열 `NEXT_PUBLIC_SITE_URL=""` 도 폴백시킨다.
  // `??` 였다면 빈 문자열이 통과해 `new URL("")` 가 layout 평가 시 throw.
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

/** 끝 슬래시 제거 — `${siteUrl}/sitemap.xml` 등 문자열 결합 소비처에서 `//` 방지(단일 소스 불변식). */
export const siteUrl = rawSiteUrl.replace(/\/+$/, "");
