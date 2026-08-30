"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_KINDS, CURRENCIES, type AccountKind, type Currency } from "@/lib/currencies";

function asCurrency(value: FormDataEntryValue | null): Currency | null {
  if (typeof value !== "string") return null;
  return CURRENCIES.includes(value as Currency) ? (value as Currency) : null;
}

function asKind(value: FormDataEntryValue | null): AccountKind | null {
  if (typeof value !== "string") return null;
  return ACCOUNT_KINDS.includes(value as AccountKind)
    ? (value as AccountKind)
    : null;
}

function asAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const kind = asKind(formData.get("kind"));
  const currency = asCurrency(formData.get("currency"));

  if (!name || !kind || !currency) return;

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    kind,
    currency,
  });

  if (error) return;
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return;
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  if (!name || (kind !== "income" && kind !== "expense")) return;

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    kind,
  });

  if (error) return;
  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return;
  revalidatePath("/categories");
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const account_id = String(formData.get("account_id") ?? "");
  const category_id = String(formData.get("category_id") ?? "") || null;
  const amount = asAmount(formData.get("amount"));
  const kind = String(formData.get("kind") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurred_on = String(formData.get("occurred_on") ?? "");

  if (
    !account_id ||
    !amount ||
    amount <= 0 ||
    (kind !== "income" && kind !== "expense") ||
    !occurred_on
  ) {
    return;
  }

  const [{ data: account }, { data: category }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    category_id
      ? supabase
          .from("categories")
          .select("id, kind")
          .eq("id", category_id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!account || (category_id && (!category || category.kind !== kind))) return;

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id,
    category_id,
    amount,
    kind,
    note,
    occurred_on,
    creator_email: user.email ?? null,
  });

  if (error) return;
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const account_id = String(formData.get("account_id") ?? "");
  const category_id = String(formData.get("category_id") ?? "") || null;
  const amount = asAmount(formData.get("amount"));
  const kind = String(formData.get("kind") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurred_on = String(formData.get("occurred_on") ?? "");

  if (
    !id ||
    !account_id ||
    !amount ||
    (kind !== "income" && kind !== "expense") ||
    !occurred_on
  ) {
    return;
  }

  const [{ data: account }, { data: category }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    category_id
      ? supabase
          .from("categories")
          .select("id, kind")
          .eq("id", category_id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!account || (category_id && (!category || category.kind !== kind))) return;

  const { error } = await supabase
    .from("transactions")
    .update({
      account_id,
      category_id,
      amount,
      kind,
      note,
      occurred_on,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) return;
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const { error } = await supabase
    .from("transactions")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) return;
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function upsertRate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const from_currency = asCurrency(formData.get("from_currency"));
  const to_currency = asCurrency(formData.get("to_currency"));
  const rate = Number(formData.get("rate"));

  if (
    !from_currency ||
    !to_currency ||
    from_currency === to_currency ||
    !rate ||
    rate <= 0
  ) {
    return;
  }

  const { error } = await supabase.from("exchange_rates").upsert(
    {
      user_id: user.id,
      from_currency,
      to_currency,
      rate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,from_currency,to_currency" },
  );

  if (error) return;
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
