"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type DonutSlice = {
  name: string;
  value: number;
  display: string;
};

export function CategoryDonut({
  slices,
  palette,
  emptyLabel,
  centerLabel,
  totalDisplay,
}: {
  slices: DonutSlice[];
  palette: string[];
  emptyLabel: string;
  centerLabel: string;
  totalDisplay?: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (slices.length === 0 || total <= 0) {
    return <p className="mt-6 text-sm text-[var(--muted)]">{emptyLabel}</p>;
  }

  const share = (value: number) => (value / total) * 100;

  return (
    <div className="mt-4">
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((slice, index) => (
                <Cell key={slice.name} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                color: "var(--ink)",
              }}
              formatter={(value, name, item) => {
                const numeric = Number(value);
                const display =
                  (item?.payload as DonutSlice | undefined)?.display ?? "";
                return [
                  `${share(numeric).toFixed(1)}% · ${display}`,
                  String(name),
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-xs text-[var(--muted)]">{centerLabel}</p>
          <p className="text-sm leading-snug">
            {totalDisplay ?? `${slices.length} categories`}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {slices.map((slice, index) => (
          <li
            key={slice.name}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: palette[index % palette.length] }}
              />
              <span className="truncate">{slice.name}</span>
            </span>
            <span className="shrink-0 text-[var(--muted)]">
              {share(slice.value).toFixed(1)}% · {slice.display}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
