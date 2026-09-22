import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (same
// mechanism, new name/export) — see node_modules/next/dist/docs/01-app/
// 01-getting-started/16-proxy.md. This runs before every matched request,
// on the server, ahead of rendering.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
