export interface CalendarDay {
  day: number;
  date: string; // YYYY-MM-DD
}

// A Sunday-first grid of the given month (1-12), in UTC, padded with `null`
// before the 1st and after the last day so every week is a full 7-cell row.
export function getMonthGrid(
  year: number,
  month: number
): (CalendarDay | null)[][] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startWeekday = firstOfMonth.getUTCDay(); // 0 = Sunday

  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
