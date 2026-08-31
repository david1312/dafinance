import { CreateMemberForm } from "@/components/create-member-form";
import { createClient } from "@/lib/supabase/server";
import type { HouseholdMember } from "@/lib/types";

export default async function FamilyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: membership }, { data: members }] = await Promise.all([
    supabase
      .from("household_members")
      .select("role")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("household_members")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  const memberList = (members ?? []) as HouseholdMember[];
  const isOwner = membership?.role === "owner";

  return (
    <div>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        Household
      </h1>
      <p className="mt-1 max-w-2xl text-[var(--muted)]">
        Everyone sees the same dashboard, accounts, categories, and
        transactions. Accounts can only be changed by their owner.
      </p>

      {isOwner ? (
        <section className="mt-8">
          <h2 className="text-lg">Add a user</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            They can sign in immediately with the email and password below.
          </p>
          <CreateMemberForm />
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg">People with access</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {memberList.map((member) => (
            <li
              className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
              key={member.user_id}
            >
              <p className="truncate">{member.email}</p>
              <p className="mt-1 text-xs capitalize text-[var(--muted)]">
                {member.role === "owner" ? "Household owner" : "Household user"}
                {member.user_id === user?.id ? " · You" : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
