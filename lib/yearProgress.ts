import { addDays, daysBetween, calculateStrengthScore } from "./strength";

export interface MonthProgress {
  month: number; // 1-12
  label: string;
  // null when the month has no eligible days yet — entirely before the
  // habit was created, or entirely in the future.
  percentage: number | null;
  completedDays: number;
  windowDays: number;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Builds a 12-entry, month-by-month completion summary for `year`. Each
// month's percentage is just its own strength score — completed days over
// eligible days in that month — computed with the same
// calculateStrengthScore() the habit detail page already uses for its
// 30-day strength badge, rather than a separate formula.
export function getYearProgress(
  year: number,
  createdAt: string,
  today: string,
  completedDates: Set<string>
): MonthProgress[] {
  const createdDateString = createdAt.slice(0, 10);

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const monthStart = `${monthPrefix}-01`;
    const monthEnd = `${monthPrefix}-${String(daysInMonth(year, month)).padStart(2, "0")}`;

    // Eligible range = this month intersected with [habit creation, today].
    const rangeStart = monthStart > createdDateString ? monthStart : createdDateString;
    const rangeEnd = monthEnd < today ? monthEnd : today;

    if (rangeStart > rangeEnd) {
      return {
        month,
        label: MONTH_LABELS[i],
        percentage: null,
        completedDays: 0,
        windowDays: 0,
      };
    }

    const windowDays = daysBetween(rangeStart, rangeEnd) + 1;
    let completedDays = 0;
    for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) {
      if (completedDates.has(d)) completedDays++;
    }

    return {
      month,
      label: MONTH_LABELS[i],
      percentage: calculateStrengthScore(windowDays, completedDays),
      completedDays,
      windowDays,
    };
  });
}
