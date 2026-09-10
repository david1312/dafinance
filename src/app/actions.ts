"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCOUNT_KINDS, CURRENCIES, type AccountKind, type Currency } from "@/lib/currencies";
import { DEFAULT_RESET_PASSWORD } from "@/lib/passwords";

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

async function findAuthUserIdByEmail(email: string) {
  const admin = createAdminClient();
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;

    const match = data.users.find(
      (authUser) => authUser.email?.toLowerCase() === email,
    );
    if (match) return match.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function setPasswordToDefault(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: DEFAULT_RESET_PASSWORD,
  });
  if (error) throw error;
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

const FUND_PLACEMENTS_CATEGORY = "Fund Placements";

export type TransferActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function transferBetweenAccounts(
  formData: FormData,
): Promise<TransferActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fromId = String(formData.get("from_account_id") ?? "");
  const toId = String(formData.get("to_account_id") ?? "");
  const amount = asAmount(formData.get("amount"));
  const occurred_on = String(formData.get("occurred_on") ?? "");
  const extraNote = String(formData.get("note") ?? "").trim();

  if (!fromId || !toId || !amount || !occurred_on) {
    return { status: "error", message: "Fill in both accounts, amount, and date." };
  }

  if (fromId === toId) {
    return { status: "error", message: "Choose two different accounts." };
  }

  const [{ data: fromAccount }, { data: toAccount }, { data: categories }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, currency")
        .eq("id", fromId)
        .maybeSingle(),
      supabase
        .from("accounts")
        .select("id, name, currency")
        .eq("id", toId)
        .maybeSingle(),
      supabase
        .from("categories")
        .select("id, kind, name")
        .eq("name", FUND_PLACEMENTS_CATEGORY),
    ]);

  if (!fromAccount || !toAccount) {
    return { status: "error", message: "One of those accounts could not be found." };
  }

  if (fromAccount.currency !== toAccount.currency) {
    return {
      status: "error",
      message: "Transfers are only allowed between accounts with the same currency.",
    };
  }

  const expenseCategory = categories?.find((category) => category.kind === "expense");
  const incomeCategory = categories?.find((category) => category.kind === "income");

  if (!expenseCategory || !incomeCategory) {
    return {
      status: "error",
      message:
        "Add Fund Placements as both an expense category and an income category first.",
    };
  }

  const expenseNote = extraNote
    ? `Transfer to ${toAccount.name}. ${extraNote}`
    : `Transfer to ${toAccount.name}`;
  const incomeNote = extraNote
    ? `Transfer from ${fromAccount.name}. ${extraNote}`
    : `Transfer from ${fromAccount.name}`;

  const { error } = await supabase.from("transactions").insert([
    {
      user_id: user.id,
      account_id: fromAccount.id,
      category_id: expenseCategory.id,
      amount,
      kind: "expense",
      note: expenseNote,
      occurred_on,
      creator_email: user.email ?? null,
    },
    {
      user_id: user.id,
      account_id: toAccount.id,
      category_id: incomeCategory.id,
      amount,
      kind: "income",
      note: incomeNote,
      occurred_on,
      creator_email: user.email ?? null,
    },
  ]);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return { status: "success", message: "Transfer recorded." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function changePassword(
  formData: FormData,
): Promise<MemberActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { status: "error", message: "Your session has expired." };
  }

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");

  if (newPassword.length < 6) {
    return {
      status: "error",
      message: "New password must be at least 6 characters.",
    };
  }

  const { error: currentError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (currentError) {
    return { status: "error", message: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "success", message: "Password updated." };
}

export async function resetPasswordToDefault(
  formData: FormData,
): Promise<MemberActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Enter a valid email address." };
  }

  try {
    const userId = await findAuthUserIdByEmail(email);
    if (!userId) {
      return { status: "error", message: "No account with that email." };
    }
    await setPasswordToDefault(userId);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not reset the password.",
    };
  }

  return {
    status: "success",
    message: `Password is now ${DEFAULT_RESET_PASSWORD}. Sign in, then change it.`,
  };
}

export async function resetMemberPassword(
  formData: FormData,
): Promise<MemberActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Your session has expired." };
  }

  const memberId = String(formData.get("user_id") ?? "");
  if (!memberId) {
    return { status: "error", message: "Missing household member." };
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner") {
    return {
      status: "error",
      message: "Only the household owner can reset a password.",
    };
  }

  const { data: member } = await supabase
    .from("household_members")
    .select("user_id, household_id")
    .eq("user_id", memberId)
    .maybeSingle();

  if (!member || member.household_id !== membership.household_id) {
    return { status: "error", message: "That person is not in your household." };
  }

  try {
    await setPasswordToDefault(memberId);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not reset the password.",
    };
  }

  return {
    status: "success",
    message: `Password is now ${DEFAULT_RESET_PASSWORD}.`,
  };
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
    const { data: created, error } = await admin.auth.admin.createUser({
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

    const newUserId = created?.user?.id;

    if (!newUserId) {
      return { status: "error", message: "Supabase did not return the user." };
    }

    const { error: attachError } = await admin.rpc(
      "attach_user_to_household",
      {
        target_user_id: newUserId,
        target_household_id: membership.household_id,
      },
    );

    if (attachError) {
      await admin.auth.admin.deleteUser(newUserId);
      return { status: "error", message: attachError.message };
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
