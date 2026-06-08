"use client";

import dynamic from "next/dynamic";

/** Recharts 지연 로드 — admin analytics 초기 번들에서 분리. EventTrendChartLazy 와 동일 패턴. */
export const StatusPieChartLazy = dynamic(
  () => import("./status-pie-chart").then((m) => m.StatusPieChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
    ),
  },
);
