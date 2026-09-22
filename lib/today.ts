// "Today" is the current UTC calendar date, not the server process's local
// timezone. Node's local Date methods (getFullYear/getMonth/getDate,
// toLocaleDateString) follow the `TZ` environment variable, which differs
// between environments — local dev typically runs in the machine's own
// timezone, while most hosting platforms default to UTC. Anchoring to UTC
// via toISOString() means the day boundary is identical everywhere the app
// runs, and — more importantly — the initial page-load read and every
// toggle-action write always agree on what "today" means, since they both
// call this same function.
//
// Known trade-off: the day rolls over at UTC midnight, not the user's local
// midnight. A user far from UTC will see today's habits reset at a
// non-midnight local time (e.g. 4pm/5pm for US Pacific). Fixing that
// properly requires knowing the user's timezone (stored on their profile,
// or read from the browser and sent with each request) and is out of scope
// here — flagging it rather than silently guessing.
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
