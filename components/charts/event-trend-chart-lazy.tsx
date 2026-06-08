"use client";

import dynamic from "next/dynamic";

/**
 * Recharts(무거운 client 전용 라이브러리)를 지연 로드해 admin analytics 라우트의
 * First Load JS 에서 분리한다. Server Component 인 analytics 페이지는 ssr:false 를
 * 직접 못 쓰므로 이 client 래퍼를 경유한다. 로딩 스켈레톤 높이는 차트(h-64)와 일치.
 */
export const EventTrendChartLazy = dynamic(
  () => import("./event-trend-chart").then((m) => m.EventTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
    ),
  },
);
