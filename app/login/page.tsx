import Link from "next/link";
import { login } from "@/app/actions/auth";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const message =
    typeof searchParams.message === "string"
      ? searchParams.message
      : undefined;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-6">Log in</h1>

        {message && (
          <p className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <form action={login} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="border rounded px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="border rounded px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="mt-2 bg-black text-white rounded px-4 py-2 font-medium"
          >
            Log in
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
