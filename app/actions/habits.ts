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
