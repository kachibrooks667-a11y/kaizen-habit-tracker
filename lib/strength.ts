import { getTodayDateString } from "./today";

const MS_PER_DAY = 86_400_000;

// Calendar-date (UTC) arithmetic, consistent with getTodayDateString()'s UTC
// anchor — see lib/today.ts for why UTC is used as the day boundary.
function toUtcDateString(isoTimestamp: string): string {
  return new Date(isoTimestamp).toISOString().slice(0, 10);
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromDateString: string, toDateString: string): number {
  const from = new Date(`${fromDateString}T00:00:00Z`).getTime();
  const to = new Date(`${toDateString}T00:00:00Z`).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

export interface StrengthWindow {
  start: string; // inclusive, YYYY-MM-DD
  end: string; // inclusive, YYYY-MM-DD — always today
  days: number; // window size — the score's denominator
}

// The strength score looks at the last 30 days, or fewer if the habit is
// younger than that. "Age" counts the creation day itself as day 1, so a
// habit created today has a 1-day window, not a 0-day one.
export function getStrengthWindow(createdAt: string): StrengthWindow {
  const end = getTodayDateString();
  const createdDate = toUtcDateString(createdAt);
  const ageDays = daysBetween(createdDate, end) + 1;
  const days = Math.min(30, Math.max(ageDays, 1));
  const start = addDays(end, -(days - 1));
  return { start, end, days };
}

export function calculateStrengthScore(
  windowDays: number,
  completedDays: number
): number {
  if (windowDays <= 0) return 0;
  return Math.round((completedDays / windowDays) * 100);
}
