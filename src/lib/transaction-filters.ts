export const PAGE_SIZE = 20;

export type TransactionFilterState = {
  from: string;
  to: string;
  amountMode: "gte" | "lte";
  amount: number;
  accountId: string;
  categoryId: string;
  showDeleted: boolean;
  cursorAt: string;
  cursorId: string;
  direction: "next" | "prev";
};

export function parseFilters(
  params: URLSearchParams | Record<string, string | undefined>,
): TransactionFilterState {
  const read = (key: string) =>
    params instanceof URLSearchParams
      ? (params.get(key) ?? "")
      : (params[key] ?? "");

  const amount = Number(read("amount").replaceAll(",", ""));

  return {
    from: read("from"),
    to: read("to"),
    amountMode: read("amountMode") === "lte" ? "lte" : "gte",
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    accountId: read("accountId"),
    categoryId: read("categoryId"),
    showDeleted: read("deleted") === "1",
    cursorAt: read("cursorAt"),
    cursorId: read("cursorId"),
    direction: read("direction") === "prev" ? "prev" : "next",
  };
}

export function buildFilterQuery(
  filters: Pick<
    TransactionFilterState,
    | "from"
    | "to"
    | "amountMode"
    | "amount"
    | "accountId"
    | "categoryId"
    | "showDeleted"
  >,
  cursor?: { cursorAt: string; cursorId: string; direction: "next" | "prev" },
) {
  const search = new URLSearchParams();

  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
  if (filters.amount > 0) {
    search.set("amountMode", filters.amountMode);
    search.set("amount", String(filters.amount));
  }
  if (filters.showDeleted) search.set("deleted", "1");
  if (filters.accountId) search.set("accountId", filters.accountId);
  if (filters.categoryId) search.set("categoryId", filters.categoryId);
  if (cursor) {
    search.set("cursorAt", cursor.cursorAt);
    search.set("cursorId", cursor.cursorId);
    search.set("direction", cursor.direction);
  }

  return search.toString();
}
