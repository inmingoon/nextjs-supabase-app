"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type TrendPoint = {
  month: string; // "2026-05" 형식
  count: number;
};

const LINE_COLOR = "#3b82f6"; // EventStatusBadge upcoming blue와 일관 (라이트/다크 공통)

const LIGHT_PALETTE = {
  grid: "#e5e7eb",
  tooltipBg: "#ffffff",
  tooltipBorder: "#e5e7eb",
  tooltipText: "#111827",
};

const DARK_PALETTE = {
  grid: "#374151",
  tooltipBg: "#1f2937",
  tooltipBorder: "#374151",
  tooltipText: "#f9fafb",
};

export function EventTrendChart({ data }: { data: TrendPoint[] }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydration 가드: mount 전에는 light palette 로 렌더 (ThemeToggle 패턴과 동일)
  const palette = mounted && resolvedTheme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: palette.tooltipBg,
              border: `1px solid ${palette.tooltipBorder}`,
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: palette.tooltipText }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={LINE_COLOR}
            strokeWidth={2}
            dot={{ r: 4, fill: LINE_COLOR }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
