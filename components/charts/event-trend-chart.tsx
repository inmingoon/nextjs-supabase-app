"use client";

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

const LINE_COLOR = "#3b82f6"; // EventStatusBadge upcoming blue와 일관

export function EventTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "#111827" }}
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
