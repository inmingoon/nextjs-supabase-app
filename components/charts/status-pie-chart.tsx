"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { EventStatus } from "@/types/event";

const LABEL: Record<EventStatus, string> = {
  upcoming: "예정",
  ongoing: "진행 중",
  completed: "종료",
};

const COLORS: Record<EventStatus, string> = {
  upcoming: "#3b82f6",
  ongoing: "#22c55e",
  completed: "#9ca3af",
};

const LIGHT_TOOLTIP = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  fontSize: 12,
};

const DARK_TOOLTIP = {
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: 6,
  fontSize: 12,
};

export type StatusSlice = { status: EventStatus; count: number };

export function StatusPieChart({ data }: { data: StatusSlice[] }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tooltipStyle = mounted && resolvedTheme === "dark" ? DARK_TOOLTIP : LIGHT_TOOLTIP;
  const labelColor = mounted && resolvedTheme === "dark" ? "#f9fafb" : "#111827";

  // Empty-state 가드: 모든 슬라이스가 0 이면 Recharts 가 빈 ring 만 표시 → 명시적 메시지로 대체
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground">
        표시할 데이터가 없습니다
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: LABEL[d.status],
    value: d.count,
    status: d.status,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={COLORS[entry.status]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: labelColor }} />
          <Legend wrapperStyle={{ color: labelColor, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
