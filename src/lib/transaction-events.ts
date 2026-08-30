export const TRANSACTIONS_CHANGED = "dafinance:transactions-changed";

export function notifyTransactionsChanged() {
  window.dispatchEvent(new Event(TRANSACTIONS_CHANGED));
}
