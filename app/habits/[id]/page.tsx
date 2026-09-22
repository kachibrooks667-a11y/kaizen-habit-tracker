import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayDateString } from "@/lib/today";
import { getStrengthWindow, calculateStrengthScore } from "@/lib/strength";
import { getMonthGrid } from "@/lib/calendar";

const MONTH_PARAM_RE = /^(\d{4})-(\d{2})$/;

function currentYearMonth(today: string): { year: number; month: number } {
  const [year, month] = today.split("-").map(Number);
  return { year, month };
}

function parseMonthParam(
  value: string | undefined,
  today: string
): { year: number; month: number } {
  const fallback = currentYearMonth(today);
  if (!value) return fallback;

  const match = MONTH_PARAM_RE.exec(value);
  if (!match) return fallback;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return fallback;

  return { year, month };
}

function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthParamString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default async function HabitDetailPage(
  props: PageProps<"/habits/[id]">
) {
  const { id } = await props.params;
  const { month: monthParam } = await props.searchParams;

  const supabase = await createClient();

  // Belt-and-suspenders: proxy.ts already redirects unauthenticated
  // requests away from this route, but checking again here means this page
  // stays safe even if the proxy matcher is ever changed or skipped.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS on `habits` restricts rows to `user_id = auth.uid()`, so this query
  // can never return another user's habit — the explicit `.eq("user_id", ...)`
  // is defense in depth, not what's doing the filtering. Either a
  // nonexistent id or someone else's id falls through to the same `!habit`
  // check below, so a stranger probing another user's habit id gets an
  // identical 404 either way — it never reveals whether the id exists.
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id, name, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (habitError) {
    throw new Error(habitError.message);
  }
  if (!habit) {
    notFound();
  }

  const today = getTodayDateString();
  const { year, month } = parseMonthParam(
    Array.isArray(monthParam) ? monthParam[0] : monthParam,
    today
  );

  const monthGrid = getMonthGrid(year, month);
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${monthPrefix}-01`;
  const monthEnd = `${monthPrefix}-${String(daysInMonth).padStart(2, "0")}`;

  const strengthWindow = getStrengthWindow(habit.created_at);

  // Two independent range queries rather than one broad fetch: the calendar
  // view (any month the user has navigated to) and the strength window
  // (always the newest 30 days) can be non-overlapping date ranges, so
  // fetching their union up front would mean guessing how far to widen it.
  const [
    { data: monthLogs, error: monthLogsError },
    { data: windowLogs, error: windowLogsError },
  ] = await Promise.all([
    supabase
      .from("habit_logs")
      .select("date")
      .eq("habit_id", habit.id)
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd),
    supabase
      .from("habit_logs")
      .select("date")
      .eq("habit_id", habit.id)
      .eq("user_id", user.id)
      .gte("date", strengthWindow.start)
      .lte("date", strengthWindow.end),
  ]);

  if (monthLogsError) {
    throw new Error(monthLogsError.message);
  }
  if (windowLogsError) {
    throw new Error(windowLogsError.message);
  }

  const completedDates = new Set((monthLogs ?? []).map((log) => log.date));
  const strength = calculateStrengthScore(
    strengthWindow.days,
    (windowLogs ?? []).length
  );

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const monthLabel = new Date(
    Date.UTC(year, month - 1, 1)
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-1 flex-col p-6 max-w-xl w-full mx-auto">
      <Link href="/dashboard" className="text-sm text-zinc-500 mb-4">
        ← Back to dashboard
      </Link>

      <div className="flex items-center justify-between gap-3 mb-2">
        <h1 className="text-2xl font-semibold">{habit.name}</h1>
        <span className="shrink-0 text-sm font-medium text-zinc-600 border rounded px-2 py-1">
          Strength: {strength}%
        </span>
      </div>

      <div className="flex items-center justify-between mt-6 mb-3">
        <Link
          href={`/habits/${habit.id}?month=${monthParamString(prev.year, prev.month)}`}
          className="border rounded px-3 py-1 text-sm"
        >
          ← Prev
        </Link>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Link
          href={`/habits/${habit.id}?month=${monthParamString(next.year, next.month)}`}
          className="border rounded px-3 py-1 text-sm"
        >
          Next →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500 mb-1">
        {weekdayLabels.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthGrid.flatMap((week, weekIndex) =>
          week.map((cell, dayIndex) => {
            if (!cell) {
              return <div key={`${weekIndex}-${dayIndex}`} />;
            }

            const done = completedDates.has(cell.date);
            const isToday = cell.date === today;

            return (
              <div
                key={cell.date}
                // Every cell keeps a border (not just non-done ones) and
                // `done` uses a color, not zinc-900, for its fill — zinc-900
                // is close enough to this app's dark-mode background
                // (globals.css) that a borderless near-black fill on a
                // near-black page was effectively invisible.
                className={`flex aspect-square items-center justify-center rounded border text-sm ${
                  done
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : isToday
                      ? "border-zinc-400 text-zinc-900 dark:text-zinc-100"
                      : "border-zinc-200 text-zinc-400"
                }`}
              >
                {cell.day}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
