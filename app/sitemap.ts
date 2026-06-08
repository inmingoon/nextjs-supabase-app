import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** 공개 색인 대상은 홈뿐(인증 게이트). invite 는 코드 비밀 + noindex 라 제외. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl, changeFrequency: "weekly", priority: 1 }];
}
