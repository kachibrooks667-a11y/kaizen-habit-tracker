import { createBrowserClient } from "@supabase/ssr";

// Client Component Supabase client. Session tokens live in cookies (not
// localStorage), so the same session is visible to the server on the next
// request — that's what makes server-side rendering + auth work together.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
