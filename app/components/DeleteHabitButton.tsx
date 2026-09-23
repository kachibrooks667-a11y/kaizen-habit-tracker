"use client";

import { deleteHabit } from "@/app/actions/habits";

export function DeleteHabitButton({
  habitId,
  habitName,
}: {
  habitId: string;
  habitName: string;
}) {
  return (
    <form
      action={deleteHabit}
      onSubmit={(event) => {
        if (
          !confirm(
            `Delete "${habitName}"? This also deletes all of its logged history.`
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="habitId" value={habitId} />
      <button
        type="submit"
        aria-label={`Delete ${habitName}`}
        title="Delete habit"
        className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.75 1a.75.75 0 0 0-.75.75V2h-3.5a.75.75 0 0 0 0 1.5h.354l.727 11.633A2.25 2.25 0 0 0 7.827 17.5h4.346a2.25 2.25 0 0 0 2.246-2.367L15.146 3.5h.354a.75.75 0 0 0 0-1.5h-3.5v-.25a.75.75 0 0 0-.75-.75h-2.5ZM8 6.75a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Zm3.75-.75a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 1.5 0v-6a.75.75 0 0 0-.75-.75Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </form>
  );
}
