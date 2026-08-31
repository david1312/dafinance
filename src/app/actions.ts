"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCOUNT_KINDS, CURRENCIES, type AccountKind, type Currency } from "@/lib/currencies";

export type MemberActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

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

export async function updateAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const kind = asKind(formData.get("kind"));
  const currency = asCurrency(formData.get("currency"));

  if (!id || !name || !kind || !currency) return;

  const { data: account } = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return;

  if (account.currency !== currency) {
    const { data: existingTransaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("account_id", id)
      .limit(1)
      .maybeSingle();

    if (existingTransaction) return;
  }

  const { error } = await supabase
    .from("accounts")
    .update({ name, kind, currency })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return;
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
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
    .eq("id", id);

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
      .maybeSingle(),
    category_id
      ? supabase
          .from("categories")
          .select("id, kind")
          .eq("id", category_id)
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
      .maybeSingle(),
    category_id
      ? supabase
          .from("categories")
          .select("id, kind")
          .eq("id", category_id)
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

export async function createHouseholdMember(
  _previousState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Your session has expired." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: "Password must be at least 8 characters.",
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .single();

  if (membershipError || membership?.role !== "owner") {
    return {
      status: "error",
      message: "Only the household owner can create another user.",
    };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        household_id: membership.household_id,
        household_role: "member",
        created_by: user.id,
      },
    });

    if (error) {
      return { status: "error", message: error.message };
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not create the user.",
    };
  }

  revalidatePath("/family");
  return {
    status: "success",
    message: `${email} can now sign in with the password you provided.`,
  };
}
