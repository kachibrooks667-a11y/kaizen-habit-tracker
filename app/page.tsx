import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The root route has no content of its own — it just sends visitors to the
// right starting point based on whether they have a session.
export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
