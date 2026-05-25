"use client";

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

export type StatusSlice = { status: EventStatus; count: number };

export function StatusPieChart({ data }: { data: StatusSlice[] }) {
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
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
