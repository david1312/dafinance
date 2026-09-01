export const DASHBOARD_MIN_DATE = "2026-08-31";

export const RANGE_PRESETS = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "last_3_months", label: "Last 3 months" },
  { id: "last_6_months", label: "Last 6 months" },
  { id: "this_year", label: "This year" },
  { id: "custom", label: "Custom range" },
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number]["id"];

export function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso() {
  return isoDate(new Date());
}

export function clampDashboardDate(value: string) {
  const today = todayIso();
  if (!value) return DASHBOARD_MIN_DATE;
  if (value < DASHBOARD_MIN_DATE) return DASHBOARD_MIN_DATE;
  if (value > today) return today;
  return value;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function rangeForPreset(
  preset: RangePreset,
  customFrom?: string,
  customTo?: string,
) {
  const now = new Date();
  const today = todayIso();
  let from = DASHBOARD_MIN_DATE;
  let to = today;

  if (preset === "this_month") {
    from = isoDate(startOfMonth(now));
    to = today;
  } else if (preset === "last_month") {
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    from = isoDate(startOfMonth(previous));
    to = isoDate(endOfMonth(previous));
  } else if (preset === "last_3_months") {
    from = isoDate(
      startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
    );
    to = today;
  } else if (preset === "last_6_months") {
    from = isoDate(
      startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1)),
    );
    to = today;
  } else if (preset === "this_year") {
    from = isoDate(new Date(now.getFullYear(), 0, 1));
    to = today;
  } else {
    from = customFrom || DASHBOARD_MIN_DATE;
    to = customTo || today;
  }

  from = clampDashboardDate(from);
  to = clampDashboardDate(to);
  if (from > to) from = to;

  return { from, to };
}

export function formatRangeLabel(from: string, to: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const start = formatter.format(new Date(`${from}T00:00:00Z`));
  const end = formatter.format(new Date(`${to}T00:00:00Z`));
  return start === end ? start : `${start} – ${end}`;
}

export function inDateRange(occurredOn: string, from: string, to: string) {
  return occurredOn >= from && occurredOn <= to;
}
