import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addHabit } from "@/app/actions/habits";
import { toggleHabitLog } from "@/app/actions/habit-logs";
import { getTodayDateString } from "@/lib/today";
import { addDays, getStrengthWindow, calculateStrengthScore } from "@/lib/strength";
import { Header } from "@/app/components/Header";
import { StrengthBadge } from "@/app/components/StrengthBadge";
import { DeleteHabitButton } from "@/app/components/DeleteHabitButton";

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
    <div className="flex flex-1 flex-col">
      <Header userEmail={user.email ?? ""} />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Habits</h1>

        <form action={addHabit} className="mb-8 flex gap-2">
          <input
            type="text"
            name="name"
            placeholder="e.g. Drink more water"
            required
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Add habit
          </button>
        </form>

        {habits && habits.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {habits.map((habit) => {
              const done = doneToday.has(habit.id);
              const strength = strengthByHabit.get(habit.id) ?? 0;
              return (
                <li
                  key={habit.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900"
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
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs leading-none transition-colors ${
                        done
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-zinc-300 hover:border-emerald-500 dark:border-zinc-600"
                      }`}
                    >
                      {done ? "✓" : ""}
                    </button>
                  </form>
                  <Link
                    href={`/habits/${habit.id}`}
                    className={`text-sm font-medium hover:underline ${
                      done
                        ? "text-zinc-400 line-through dark:text-zinc-500"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {habit.name}
                  </Link>
                  <div className="ml-auto flex items-center gap-1">
                    <StrengthBadge strength={strength} />
                    <DeleteHabitButton habitId={habit.id} habitName={habit.name} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No habits yet — add your first one above.
          </p>
        )}
      </div>
    </div>
  );
}
