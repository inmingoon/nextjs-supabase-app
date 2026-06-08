import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/**
 * 인증 게이트 앱: 비공개 라우트는 검색 색인 차단.
 * /invite 는 disallow 하지 않는다 — robots.txt 로 막으면 일부 unfurler 가 OG 를 못 읽어
 * 공유 미리보기가 깨질 수 있어, 색인 차단은 invite 페이지의 page-level noindex 가 담당.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/my-events", "/profile", "/events", "/auth"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
