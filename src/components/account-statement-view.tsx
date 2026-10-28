import {
  NetChangeBadge,
  SummaryCard,
  netChangeColor,
} from "@/components/report-summary";
import {
  accountKindLabel,
  formatMoney,
  formatSignedMoney,
} from "@/lib/currencies";
import {
  formatClosingLabel,
  formatOpeningLabel,
  formatPeriodLabel,
  type AccountReport,
} from "@/lib/account-report";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function AccountStatementView({ report }: { report: AccountReport }) {
  const currency = report.account.currency;
  const netChange = report.closingBalance - report.initialBalance;
  const newestFirst = [...report.rows].reverse();

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            className="text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {report.account.name}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {accountKindLabel(report.account.kind)} · {currency} ·{" "}
            {formatPeriodLabel(report.from, report.to)}
          </p>
        </div>
        <p className="text-sm text-[var(--muted)]">
          {report.rows.length} transaction{report.rows.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Opening balance"
          hint={formatOpeningLabel(report.from)}
        >
          {formatMoney(report.initialBalance, currency)}
        </SummaryCard>
        <SummaryCard
          label="Closing balance"
          hint={formatClosingLabel(report.to)}
        >
          {formatMoney(report.closingBalance, currency)}
        </SummaryCard>
        <SummaryCard
          emphasis
          label="Net change"
          hint="Closing minus opening"
          footer={
            <>
              <span className="text-[var(--up)]">
                In {formatMoney(report.totalIn, currency)}
              </span>
              {" · "}
              <span className="text-[var(--down)]">
                Out {formatMoney(report.totalOut, currency)}
              </span>
            </>
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className={netChangeColor(netChange)}>
              {formatSignedMoney(netChange, currency)}
            </span>
            <NetChangeBadge amount={netChange} />
          </span>
        </SummaryCard>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-[var(--accent-soft)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">In</th>
              <th className="px-4 py-3 text-right font-medium">Out</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr className="border-t border-[var(--line)] bg-[var(--bg)] font-medium">
              <td className="px-4 py-3 text-[var(--muted)]">
                {formatClosingLabel(report.to)}
              </td>
              <td className="px-4 py-3" colSpan={3}>
                Closing balance
              </td>
              <td className="px-4 py-3 text-right">
                {formatMoney(report.closingBalance, currency)}
              </td>
            </tr>

            {newestFirst.length === 0 ? (
              <tr className="border-t border-[var(--line)]">
                <td
                  className="px-4 py-8 text-center text-[var(--muted)]"
                  colSpan={5}
                >
                  No transactions in this period.
                </td>
              </tr>
            ) : (
              newestFirst.map((row) => (
                <tr key={row.id} className="border-t border-[var(--line)]">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                    {dateLabel(row.occurredOn)}
                  </td>
                  <td className="px-4 py-3">
                    <p>{row.category}</p>
                    {row.note ? (
                      <p className="text-xs text-[var(--muted)]">{row.note}</p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--up)]">
                    {row.inAmount ? formatMoney(row.inAmount, currency) : ""}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--down)]">
                    {row.outAmount ? formatMoney(row.outAmount, currency) : ""}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatMoney(row.balance, currency)}
                  </td>
                </tr>
              ))
            )}

            <tr className="border-t border-[var(--line)] bg-[var(--bg)] font-medium">
              <td className="px-4 py-3 text-[var(--muted)]">
                {formatOpeningLabel(report.from)}
              </td>
              <td className="px-4 py-3" colSpan={3}>
                Opening balance
              </td>
              <td className="px-4 py-3 text-right">
                {formatMoney(report.initialBalance, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
