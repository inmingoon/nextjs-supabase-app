import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Supabase Storage(event-covers 버킷) public URL 만 next/image 최적화 허용.
    // hostname 의 프로젝트 ref(bwtzjdoonhnwrroxoxkf)는 NEXT_PUBLIC_SUPABASE_URL 호스트와 동일 —
    // 프로젝트 이전 시 함께 갱신할 것. (next.config 는 정적 평가라 env 파싱 대신 하드코딩.)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bwtzjdoonhnwrroxoxkf.supabase.co",
        pathname: "/storage/v1/object/public/event-covers/**",
      },
    ],
  },
};

export default nextConfig;
