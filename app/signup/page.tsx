import Link from "next/link";
import { signup } from "@/app/actions/auth";

export default async function SignupPage(props: PageProps<"/signup">) {
  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-6">Sign up</h1>

        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <form action={signup} className="flex flex-col gap-4">
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
              minLength={6}
              className="border rounded px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="mt-2 bg-black text-white rounded px-4 py-2 font-medium"
          >
            Sign up
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
