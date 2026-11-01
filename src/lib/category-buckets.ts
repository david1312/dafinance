import type { Category } from "@/lib/types";

/**
 * How a category counts on the dashboard:
 *  - everyday:  real income and spending — what cash flow is about
 *  - transfer:  money moving between your own accounts (fund placements,
 *               e-money top-ups); one side's "out" is another's "in"
 *  - investing: buying investments and the returns they bring
 *
 * Matched by keyword so it works for old and renamed categories alike.
 */
export type CategoryBucket = "everyday" | "transfer" | "investing";

const TRANSFER_KEYWORDS = [
  "fund placement",
  "top-up",
  "topup",
  "top up",
  "e-money",
  "emoney",
];

const INVESTING_KEYWORDS = [
  "invest",
  "capital gain",
  "capital loss",
  "dividend",
  "divident",
  "trading income",
  "stock",
  "bond",
  "mutual fund",
  "reksadana",
];

export function categoryBucket(
  category: Pick<Category, "name"> | null | undefined,
): CategoryBucket {
  if (!category) return "everyday";
  const name = category.name.toLowerCase();
  if (TRANSFER_KEYWORDS.some((keyword) => name.includes(keyword))) {
    return "transfer";
  }
  if (INVESTING_KEYWORDS.some((keyword) => name.includes(keyword))) {
    return "investing";
  }
  return "everyday";
}
