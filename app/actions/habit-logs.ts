"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTodayDateString } from "@/lib/today";

// Toggles today's completion state for one habit.
//
// Toggling off deletes the habit_logs row for today rather than setting
// completed = false. With a unique(habit_id, date) constraint, "a row
// exists for today" is a simpler source of truth than "a row exists AND
// completed = true" — the read side (dashboard page) doesn't need an extra
// `.eq("completed", true)` filter, and re-checking the box later is a
// plain insert instead of an upsert with an ON CONFLICT clause.
export async function toggleHabitLog(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const habitId = formData.get("habitId") as string | null;
  const wasDone = formData.get("wasDone") === "true";

  if (!habitId) {
    return;
  }

  const today = getTodayDateString();

  if (wasDone) {
    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("user_id", user.id)
      .eq("date", today);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    // user_id comes from the trusted session, matching the pattern in
    // app/actions/habits.ts — the client only supplies which habit was
    // clicked.
    const { error } = await supabase.from("habit_logs").insert({
      habit_id: habitId,
      user_id: user.id,
      date: today,
      completed: true,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/dashboard");
}
