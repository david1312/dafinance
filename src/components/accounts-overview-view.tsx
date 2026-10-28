import {
  NetChangeBadge,
  SummaryCard,
  formatSignedMoney,
  netChangeColor,
} from "@/components/report-summary";
import { accountKindLabel, formatMoney } from "@/lib/currencies";
import {
  formatClosingLabel,
  formatOpeningLabel,
  formatPeriodLabel,
  type AccountsOverview,
} from "@/lib/account-report";
import type { Account } from "@/lib/types";

export function AccountsOverviewView({
  overview,
  onOpenAccount,
}: {
  overview: AccountsOverview;
  onOpenAccount: (account: Account) => void;
}) {
  const accountCount = overview.groups.reduce(
    (sum, group) => sum + group.rows.length,
    0,
  );

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            className="text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            All accounts
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {formatPeriodLabel(overview.from, overview.to)} · {accountCount}{" "}
            account{accountCount === 1 ? "" : "s"}
          </p>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Select an account to see its statement.
        </p>
      </div>

      {overview.groups.map((group) => {
        const netChange = group.closingBalance - group.initialBalance;

        return (
          <div key={group.currency} className="mt-6">
            {overview.groups.length > 1 ? (
              <h3 className="mb-3 text-sm font-medium tracking-wide text-[var(--muted)]">
                {group.currency} accounts
              </h3>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                label="Total opening balance"
                hint={formatOpeningLabel(overview.from)}
              >
                {formatMoney(group.initialBalance, group.currency)}
              </SummaryCard>
              <SummaryCard
                label="Total closing balance"
                hint={formatClosingLabel(overview.to)}
              >
                {formatMoney(group.closingBalance, group.currency)}
              </SummaryCard>
              <SummaryCard
                emphasis
                label="Net change"
                hint="Closing minus opening"
                footer={
                  <>
                    <span className="text-[var(--up)]">
                      In {formatMoney(group.totalIn, group.currency)}
                    </span>
                    {" · "}
                    <span className="text-[var(--down)]">
                      Out {formatMoney(group.totalOut, group.currency)}
                    </span>
                  </>
                }
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className={netChangeColor(netChange)}>
                    {formatSignedMoney(netChange, group.currency)}
                  </span>
                  <NetChangeBadge amount={netChange} />
                </span>
              </SummaryCard>
            </div>

            <div className="mt-3 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-[var(--accent-soft)] text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 text-right font-medium">Opening</th>
                    <th className="px-4 py-3 text-right font-medium">In</th>
                    <th className="px-4 py-3 text-right font-medium">Out</th>
                    <th className="px-4 py-3 text-right font-medium">Closing</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Net change
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {group.rows.map((row) => {
                    const rowChange = row.closingBalance - row.initialBalance;
                    const idle =
                      row.transactionCount === 0 && row.closingBalance === 0;

                    return (
                      <tr
                        key={row.account.id}
                        className={`cursor-pointer border-t border-[var(--line)] transition hover:bg-[var(--accent-soft)] ${
                          idle ? "text-[var(--muted)]" : ""
                        }`}
                        onClick={() => onOpenAccount(row.account)}
                      >
                        <td className="px-4 py-3">
                          <button
                            className="text-left"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenAccount(row.account);
                            }}
                          >
                            <span className="block text-[var(--ink)] underline-offset-2 hover:underline">
                              {row.account.name}
                            </span>
                            <span className="block text-xs text-[var(--muted)]">
                              {accountKindLabel(row.account.kind)} ·{" "}
                              {row.transactionCount} transaction
                              {row.transactionCount === 1 ? "" : "s"}
                            </span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {formatMoney(row.initialBalance, group.currency)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--up)]">
                          {row.totalIn
                            ? formatMoney(row.totalIn, group.currency)
                            : ""}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--down)]">
                          {row.totalOut
                            ? formatMoney(row.totalOut, group.currency)
                            : ""}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {formatMoney(row.closingBalance, group.currency)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right ${netChangeColor(rowChange)}`}
                        >
                          {rowChange === 0
                            ? "—"
                            : formatSignedMoney(rowChange, group.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="tabular-nums">
                  <tr className="border-t-2 border-[var(--line)] bg-[var(--bg)] font-medium">
                    <td className="px-4 py-3">Total</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {formatMoney(group.initialBalance, group.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--up)]">
                      {formatMoney(group.totalIn, group.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--down)]">
                      {formatMoney(group.totalOut, group.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {formatMoney(group.closingBalance, group.currency)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right ${netChangeColor(netChange)}`}
                    >
                      {formatSignedMoney(netChange, group.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}

      <p className="mt-4 text-xs text-[var(--muted)]">
        Transfers between your own accounts show up as money in on one account
        and money out on the other, so they cancel out in the totals.
      </p>
    </section>
  );
}
