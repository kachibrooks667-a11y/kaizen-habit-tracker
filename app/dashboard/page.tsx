import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { addHabit } from "@/app/actions/habits";
import { toggleHabitLog } from "@/app/actions/habit-logs";
import { getTodayDateString } from "@/lib/today";
import { addDays, getStrengthWindow, calculateStrengthScore } from "@/lib/strength";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Belt-and-suspenders: proxy.ts already redirects unauthenticated
  // requests away from /dashboard, but checking again here means this page
  // stays safe even if the proxy matcher is ever changed or skipped.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = getTodayDateString();
  // Widest possible strength window is 30 days — fetching that much once
  // covers every habit's own (possibly narrower) window computed below,
  // instead of running one query per habit.
  const thirtyDaysAgo = addDays(today, -29);

  // RLS on both tables restricts rows to `user_id = auth.uid()`, so these
  // queries only ever return this user's data — the explicit
  // `.eq("user_id", ...)` calls below are defense in depth, not what's
  // doing the filtering.
  const [
    { data: habits, error: habitsError },
    { data: logs, error: logsError },
    { data: recentLogs, error: recentLogsError },
  ] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("habit_logs")
      .select("habit_id")
      .eq("user_id", user.id)
      .eq("date", today),
    supabase
      .from("habit_logs")
      .select("habit_id, date")
      .eq("user_id", user.id)
      .gte("date", thirtyDaysAgo),
  ]);

  if (habitsError) {
    throw new Error(habitsError.message);
  }
  if (logsError) {
    throw new Error(logsError.message);
  }
  if (recentLogsError) {
    throw new Error(recentLogsError.message);
  }

  const doneToday = new Set((logs ?? []).map((log) => log.habit_id));

  const recentDatesByHabit = new Map<string, string[]>();
  for (const log of recentLogs ?? []) {
    const dates = recentDatesByHabit.get(log.habit_id) ?? [];
    dates.push(log.date);
    recentDatesByHabit.set(log.habit_id, dates);
  }

  const strengthByHabit = new Map<string, number>();
  for (const habit of habits ?? []) {
    const window = getStrengthWindow(habit.created_at);
    const dates = recentDatesByHabit.get(habit.id) ?? [];
    const completedInWindow = dates.filter((date) => date >= window.start).length;
    strengthByHabit.set(habit.id, calculateStrengthScore(window.days, completedInWindow));
  }

  return (
    <div className="flex flex-1 flex-col p-6 max-w-xl w-full mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action={logout}>
          <button
            type="submit"
            className="border rounded px-4 py-2 text-sm font-medium"
          >
            Log out
          </button>
        </form>
      </div>

      <p className="text-zinc-600 mb-6">Signed in as {user.email}</p>

      <form action={addHabit} className="flex gap-2 mb-8">
        <input
          type="text"
          name="name"
          placeholder="e.g. Drink more water"
          required
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-zinc-900 text-white rounded px-4 py-2 text-sm font-medium hover:bg-zinc-700"
        >
          Add habit
        </button>
      </form>

      {habits && habits.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => {
            const done = doneToday.has(habit.id);
            const strength = strengthByHabit.get(habit.id) ?? 0;
            return (
              <li
                key={habit.id}
                className="flex items-center gap-3 border rounded px-3 py-2 text-sm"
              >
                <form action={toggleHabitLog}>
                  <input type="hidden" name="habitId" value={habit.id} />
                  <input
                    type="hidden"
                    name="wasDone"
                    value={done ? "true" : "false"}
                  />
                  <button
                    type="submit"
                    aria-pressed={done}
                    aria-label={
                      done
                        ? `Mark ${habit.name} as not done today`
                        : `Mark ${habit.name} as done today`
                    }
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs leading-none ${
                      done
                        ? "bg-zinc-900 border-zinc-900 text-white"
                        : "border-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {done ? "✓" : ""}
                  </button>
                </form>
                <Link
                  href={`/habits/${habit.id}`}
                  className={`hover:underline ${
                    done ? "line-through text-zinc-400" : "text-zinc-900"
                  }`}
                >
                  {habit.name}
                </Link>
                <span className="ml-auto shrink-0 text-xs font-medium text-zinc-500 border rounded px-1.5 py-0.5">
                  Strength: {strength}%
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-zinc-500 text-sm">
          No habits yet — add your first one above.
        </p>
      )}
    </div>
  );
}
