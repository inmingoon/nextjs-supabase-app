/**
 * 배포 환경별 canonical origin.
 * OG 절대경로(metadataBase) · robots · sitemap 에서 공용 사용.
 * 우선순위: 명시 SITE_URL > Vercel production 고정 도메인 > Vercel 배포별 URL > localhost.
 * VERCEL_URL 만 쓰면 preview 마다 도메인이 바뀌어 OG 절대경로가 깨질 수 있어 production 우선.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
