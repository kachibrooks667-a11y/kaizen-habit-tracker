import Link from "next/link";
import { logout } from "@/app/actions/auth";

export function Header({ userEmail }: { userEmail: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Kaizen
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
            {userEmail}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
