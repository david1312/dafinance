"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function SpendingChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  if (rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-[var(--muted)]">
        No expenses this month yet.
      </p>
    );
  }

  return (
    <div className="mt-4 h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <XAxis dataKey="name" tick={{ fill: "#9aa89f", fontSize: 12 }} />
          <YAxis tick={{ fill: "#9aa89f", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "#171c19",
              border: "1px solid #2a332e",
            }}
          />
          <Bar dataKey="value" fill="#d4b46a" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
