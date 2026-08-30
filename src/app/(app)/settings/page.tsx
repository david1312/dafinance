import { upsertRate } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { CURRENCIES } from "@/lib/currencies";
import { createClient } from "@/lib/supabase/server";
import type { ExchangeRate } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("from_currency");
  const rates = (data ?? []).map((row) => ({
    ...row,
    rate: Number(row.rate),
  })) as ExchangeRate[];

  return (
    <div>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        Exchange rates
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        Manual rates for now. Dashboard converts everything to IDR.
      </p>

      <form action={upsertRate} className="mt-8 grid gap-3 sm:grid-cols-4">
        <select
          name="from_currency"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
          defaultValue="USD"
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        <select
          name="to_currency"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
          defaultValue="IDR"
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        <input
          name="rate"
          type="number"
          min="0.000001"
          step="0.000001"
          required
          placeholder="Rate"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
        />
        <SubmitButton
          className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 font-medium text-[var(--on-accent)]"
          pendingLabel="Saving…"
        >
          Save rate
        </SubmitButton>
      </form>

      <ul className="mt-8 space-y-2">
        {rates.map((rate) => (
          <li
            key={rate.id}
            className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
          >
            1 {rate.from_currency} = {rate.rate} {rate.to_currency}
          </li>
        ))}
      </ul>
    </div>
  );
}
