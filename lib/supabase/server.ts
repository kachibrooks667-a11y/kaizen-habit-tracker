import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Component / Server Action / Route Handler Supabase client. Reads
// the session from the request's cookies via next/headers. `setAll` can
// fail here because Server Components can't write cookies — that's fine as
// long as proxy.ts is refreshing the session on every request (it is).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — ignored because proxy.ts
            // refreshes the user's session on every request.
          }
        },
      },
    }
  );
}
