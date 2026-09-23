import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayDateString } from "@/lib/today";
import { getStrengthWindow, calculateStrengthScore } from "@/lib/strength";
import { getMonthGrid } from "@/lib/calendar";
import { getYearProgress } from "@/lib/yearProgress";
import { Header } from "@/app/components/Header";
import { StrengthBadge, strengthClasses } from "@/app/components/StrengthBadge";

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

type DetailView = "month" | "year";

function parseViewParam(value: string | undefined): DetailView {
  return value === "year" ? "year" : "month";
}

function parseYearParam(value: string | undefined, today: string): number {
  const fallback = Number(today.slice(0, 4));
  if (!value) return fallback;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1970 || year > 9999) return fallback;
  return year;
}

export default async function HabitDetailPage(
  props: PageProps<"/habits/[id]">
) {
  const { id } = await props.params;
  const {
    month: monthParam,
    view: viewParam,
    year: yearParam,
  } = await props.searchParams;

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
  const view = parseViewParam(Array.isArray(viewParam) ? viewParam[0] : viewParam);
  const { year, month } = parseMonthParam(
    Array.isArray(monthParam) ? monthParam[0] : monthParam,
    today
  );
  const selectedYear = parseYearParam(
    Array.isArray(yearParam) ? yearParam[0] : yearParam,
    today
  );

  const monthGrid = getMonthGrid(year, month);
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${monthPrefix}-01`;
  const monthEnd = `${monthPrefix}-${String(daysInMonth).padStart(2, "0")}`;

  const strengthWindow = getStrengthWindow(habit.created_at);

  // The detail-view query fetches whichever range the current tab needs —
  // a single month for the Month view, the full selected year for the Year
  // view — and runs alongside the strength-window query (always the newest
  // 30 days), since those two ranges can be non-overlapping and fetching
  // their union up front would mean guessing how far to widen it.
  const detailLogsQuery =
    view === "year"
      ? supabase
          .from("habit_logs")
          .select("date")
          .eq("habit_id", habit.id)
          .eq("user_id", user.id)
          .gte("date", `${selectedYear}-01-01`)
          .lte("date", `${selectedYear}-12-31`)
      : supabase
          .from("habit_logs")
          .select("date")
          .eq("habit_id", habit.id)
          .eq("user_id", user.id)
          .gte("date", monthStart)
          .lte("date", monthEnd);

  const [
    { data: detailLogs, error: detailLogsError },
    { data: windowLogs, error: windowLogsError },
  ] = await Promise.all([
    detailLogsQuery,
    supabase
      .from("habit_logs")
      .select("date")
      .eq("habit_id", habit.id)
      .eq("user_id", user.id)
      .gte("date", strengthWindow.start)
      .lte("date", strengthWindow.end),
  ]);

  if (detailLogsError) {
    throw new Error(detailLogsError.message);
  }
  if (windowLogsError) {
    throw new Error(windowLogsError.message);
  }

  const completedDates = new Set((detailLogs ?? []).map((log) => log.date));
  const strength = calculateStrengthScore(
    strengthWindow.days,
    (windowLogs ?? []).length
  );

  const yearProgress =
    view === "year"
      ? getYearProgress(selectedYear, habit.created_at, today, completedDates)
      : null;

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
    <div className="flex flex-1 flex-col">
      <Header userEmail={user.email ?? ""} />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
        <Link
          href="/dashboard"
          className="mb-4 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Back to dashboard
        </Link>

        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {habit.name}
          </h1>
          <StrengthBadge strength={strength} />
        </div>

        <div className="mb-4 inline-flex w-fit rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
          <Link
            href={`/habits/${habit.id}?view=month`}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              view === "month"
                ? "bg-accent text-accent-foreground"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            }`}
          >
            Month
          </Link>
          <Link
            href={`/habits/${habit.id}?view=year`}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              view === "year"
                ? "bg-accent text-accent-foreground"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            }`}
          >
            Year
          </Link>
        </div>

        {view === "month" ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <Link
                href={`/habits/${habit.id}?view=month&month=${monthParamString(prev.year, prev.month)}`}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-600 transition-colors hover:border-accent hover:text-accent dark:border-zinc-700 dark:text-zinc-300"
              >
                ← Prev
              </Link>
              <span className="text-sm font-semibold">{monthLabel}</span>
              <Link
                href={`/habits/${habit.id}?view=month&month=${monthParamString(next.year, next.month)}`}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-600 transition-colors hover:border-accent hover:text-accent dark:border-zinc-700 dark:text-zinc-300"
              >
                Next →
              </Link>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
              {weekdayLabels.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
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
                      className={`flex aspect-square items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                        done
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : isToday
                            ? "border-accent bg-accent/5 text-zinc-900 dark:text-zinc-100"
                            : "border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600"
                      }`}
                    >
                      {cell.day}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <Link
                href={`/habits/${habit.id}?view=year&year=${selectedYear - 1}`}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-600 transition-colors hover:border-accent hover:text-accent dark:border-zinc-700 dark:text-zinc-300"
              >
                ← Prev
              </Link>
              <span className="text-sm font-semibold">{selectedYear}</span>
              <Link
                href={`/habits/${habit.id}?view=year&year=${selectedYear + 1}`}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-600 transition-colors hover:border-accent hover:text-accent dark:border-zinc-700 dark:text-zinc-300"
              >
                Next →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {(yearProgress ?? []).map((m) => (
                <div
                  key={m.month}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-4 text-center transition-colors ${
                    m.percentage === null
                      ? "border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600"
                      : strengthClasses(m.percentage)
                  }`}
                >
                  <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                    {m.label}
                  </span>
                  <span className="text-lg font-semibold">
                    {m.percentage === null ? "—" : `${m.percentage}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
