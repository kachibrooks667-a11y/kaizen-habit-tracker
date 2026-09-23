export function strengthClasses(strength: number): string {
  if (strength < 30) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400";
  }
  if (strength < 70) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400";
}

export function StrengthBadge({ strength }: { strength: number }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${strengthClasses(
        strength
      )}`}
    >
      {strength}%
    </span>
  );
}
