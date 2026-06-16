-- Daily Grind: Supabase schema
-- Run this in the Supabase SQL editor to initialize the database.

create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  duration_label text,
  "order"    integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists daily_logs (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  task_id    uuid not null references tasks(id) on delete restrict,
  completed  boolean not null default false,
  unique(date, task_id)
);

create index if not exists daily_logs_date_idx on daily_logs(date);

-- Seed default tasks
insert into tasks (name, duration_label, "order") values
  ('Sleep',                   '8 hrs',    0),
  ('Meditation',              '20 mins',  1),
  ('Gym',                     '1 hr',     2),
  ('DSA - Blind 75',          '2 hrs',    3),
  ('System Design',           '1.5 hrs',  4),
  ('LLD / Machine Coding',    '1 hr',     5),
  ('Job Applications + Outreach', '1 hr', 6),
  ('Mock / Review',           '0.5 hrs',  7)
on conflict do nothing;
