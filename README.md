# Kaizen Habit Tracker

A small, focused habit tracker for building consistency one day at a time. Add the habits you want to keep, check them off each day, and see how consistent you've really been over the past month and across the year.

It's built for anyone who wants a no-frills way to track daily habits, without streak pressure, gamification or clutter. It was built as part of the Kaizen cohort, and the name comes from the idea it's built around: small, continuous improvement.

## Built With AI-Assisted Development

This project was built using [Claude Code](https://claude.com/claude-code) as an AI pair-programmer, directed and reviewed by me throughout. Claude Code wrote the initial implementation for each feature based on my requirements; I tested every feature manually before moving to the next, reviewed and understood the reasoning behind each technical decision (data modeling, security policies, deployment configuration), and debugged real issues as they came up along the way — including a Postgres permission-grant bug, a Supabase environment variable misconfiguration in production, and a git authentication hiccup during deployment. The "Technical Decisions" section below reflects choices I can explain and defend, not just accept.

## Live Demo

🔗 **[kaizen-habit-tracker-xi.vercel.app](https://kaizen-habit-tracker-xi.vercel.app)**

## Features

- **Habit creation and deletion:** add a habit by name from the dashboard, or delete it. Deleting a habit also removes its entire history.
- **Daily check-off:** mark each habit done (or not done) for today with one click.
- **Strength scoring:** every habit gets a strength score: the percentage of days it was completed over the last 30 days (or since it was created, if it's newer than that). Scores are color-coded red, amber or green.
- **Monthly calendar history:** each habit has a detail page with a calendar grid showing which days it was completed. You can page back and forward through the months.
- **Yearly progress view:** switch to a 12-month overview showing each month's completion percentage, color-coded the same way as the strength score.
- **Authentication:** email/password sign-up and login through Supabase Auth. Every user sees only their own habits.

## Tech Stack

| Layer          | Technology                                                    |
| -------------- | ------------------------------------------------------------- |
| Framework      | [Next.js](https://nextjs.org) 16 (App Router, Server Actions) |
| Language       | TypeScript                                                    |
| Styling        | [Tailwind CSS](https://tailwindcss.com) v4                    |
| Database       | [Supabase](https://supabase.com) Postgres                     |
| Auth           | Supabase Auth (via `@supabase/ssr`, cookie-based sessions)    |
| Data isolation | Postgres Row Level Security                                   |
| Hosting        | [Vercel](https://vercel.com)                                  |
| Built with     | [Claude Code](https://claude.com/claude-code)                 |

## Technical Decisions

### `habit_logs` is its own normalized table

Each completion is stored as a row in `habit_logs` (`habit_id`, `user_id`, `date`), with a unique constraint on `(habit_id, date)`. The alternative would be a date array on the `habits` row. A separate table makes the queries this app needs cheap and simple: "what's done today," "completions in the last 30 days" and "completions in this month" are all plain indexed range filters on `date`, not array scans. The unique constraint means the database itself prevents a habit from being logged twice on the same day. Checking a habit off is a single insert and unchecking it is a single delete, so there's no read-modify-write of an array that two requests could race on. A foreign key with `ON DELETE CASCADE` also means deleting a habit removes its history in the same transaction.

### Row Level Security for data isolation

Both tables have RLS policies that restrict every read and write to rows where `user_id = auth.uid()`. Because the app talks to Supabase with the public anon key, the database has to enforce access control itself, and RLS does exactly that. Even if a query in the app forgot a filter, or someone called the Supabase API directly with their own session, they could never read or modify another user's habits. The application code still adds explicit `user_id` filters as defense in depth, but those filters aren't what keeps data safe. As a side effect, requesting someone else's habit ID returns the same 404 as an ID that doesn't exist, so the app never reveals whether a habit exists.

### Authentication, even for a solo-use app

A habit tracker is personal, so it's tempting to skip auth entirely. But the app is deployed to a public URL, and without an identity attached to each request the data would be readable and writable by anyone who found the link. Auth also gives RLS something to key on: `auth.uid()` is what makes the policies above work. Including it from the start also means the app already supports multiple independent users, without retrofitting ownership onto existing data later.

## Running Locally

### Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/kachibrooks667-a11y/kaizen-habit-tracker.git
cd kaizen-habit-tracker
npm install
```

### 2. Set environment variables

Copy the example file and fill in the values from your Supabase project (**Project Settings → API**):

```bash
cp .env.local.example .env.local
```

| Variable                        | Description                   |
| ------------------------------- | ----------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

### 3. Create the database schema

In the Supabase dashboard, open the **SQL Editor** and run:

```sql
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  completed boolean not null default true,
  unique (habit_id, date)
);

alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "Users manage their own habits"
  on habits for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their own habit logs"
  on habit_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on habits, habit_logs to authenticated;
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000/signup](http://localhost:3000/signup) to create an account. If email confirmation is enabled in your Supabase project (it is by default), confirm your email before logging in.
