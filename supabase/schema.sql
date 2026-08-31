-- ============================================================================
--  Kế hoạch phát triển bản thân — lược đồ cơ sở dữ liệu (Supabase / Postgres)
--  Chạy 1 lần: Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
--  An toàn khi chạy lại nhiều lần (dùng "if not exists" / "or replace").
-- ============================================================================

-- 1. MỤC TIÊU LỚN --------------------------------------------------------------
create table if not exists public.objectives (
  id            text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  unit          text default '',
  start_value   double precision default 0,
  target_value  double precision default 0,
  deadline      text default '',
  archived      boolean default false,
  created_at    timestamptz default now()
);

-- Các lần cập nhật tiến độ cho mục tiêu lớn
create table if not exists public.objective_checkins (
  id            bigint generated always as identity primary key,
  objective_id  text not null references public.objectives (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          text not null,
  value         double precision not null,
  unique (objective_id, date)
);

-- 2. MỤC TIÊU HẰNG NGÀY ------------------------------------------------------
create table if not exists public.goals (
  id            text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  target_hours  double precision default 1,
  pillar        text not null default 'work',   -- work | study | health | research
  objective_id  text references public.objectives (id) on delete set null,
  schedule      jsonb not null default '{}'::jsonb,
  archived      boolean default false,
  created_at    text default to_char(now(), 'YYYY-MM-DD')
);

-- 3. NHẬT KÝ THEO NGÀY -----------------------------------------------------
--    1 dòng / 1 ngày, "blocks" là mảng JSON các khối thời gian trong ngày.
create table if not exists public.day_logs (
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          text not null,                  -- 'YYYY-MM-DD'
  blocks        jsonb not null default '[]'::jsonb,
  updated_at    timestamptz default now(),
  primary key (user_id, date)
);

-- 4. TỔNG KẾT TUẦN (tự động chấm điểm + gợi ý) ---------------------------
create table if not exists public.weekly_reviews (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  week_start    text not null,                  -- thứ 2 đầu tuần, 'YYYY-MM-DD'
  metrics       jsonb not null default '{}'::jsonb,
  ai_summary    text default '',
  created_at    timestamptz default now(),
  unique (user_id, week_start)
);

-- 5. THIẾT LẬP CÁ NHÂN -----------------------------------------------------
create table if not exists public.settings (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  data          jsonb not null default '{}'::jsonb,
  updated_at    timestamptz default now()
);

-- ============================================================================
--  ROW LEVEL SECURITY — mỗi người chỉ đọc/ghi được dữ liệu của chính mình
-- ============================================================================
alter table public.objectives         enable row level security;
alter table public.objective_checkins enable row level security;
alter table public.goals              enable row level security;
alter table public.day_logs           enable row level security;
alter table public.weekly_reviews     enable row level security;
alter table public.settings           enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'objectives', 'objective_checkins', 'goals',
    'day_logs', 'weekly_reviews', 'settings'
  ]
  loop
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);

    execute format(
      'create policy "own rows select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Chỉ số phụ trợ cho truy vấn theo ngày
create index if not exists goals_user_idx        on public.goals (user_id);
create index if not exists objectives_user_idx   on public.objectives (user_id);
create index if not exists checkins_obj_idx      on public.objective_checkins (objective_id);
create index if not exists day_logs_user_idx     on public.day_logs (user_id);
create index if not exists weekly_user_idx       on public.weekly_reviews (user_id, week_start);
