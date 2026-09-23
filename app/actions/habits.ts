"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addHabit(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) {
    return;
  }

  // user_id comes from the trusted session, not from the form — the client
  // only supplies the habit name.
  const { error } = await supabase
    .from("habits")
    .insert({ name, user_id: user.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

// habit_logs.habit_id has `references habits (id) on delete cascade`, so
// Postgres removes every log row for this habit as part of the same delete
// transaction — there's no separate cleanup step and no window where
// orphaned logs could exist.
export async function deleteHabit(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const habitId = formData.get("habitId") as string | null;
  if (!habitId) {
    return;
  }

  // RLS restricts deletes to rows where user_id = auth.uid(), so this can
  // never delete another user's habit — the explicit `.eq("user_id", ...)`
  // is defense in depth, matching the pattern in the queries above.
  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}
