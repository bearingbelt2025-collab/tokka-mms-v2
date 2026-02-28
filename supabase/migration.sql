-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- MACHINES
-- ============================================================
create table machines (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  model text,
  serial_number text,
  location text,
  status text not null default 'running' check (status in ('running', 'maintenance_due', 'breakdown')),
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- USER PROFILES
-- ============================================================
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'technician' check (role in ('admin', 'technician')),
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_profiles (id, email, role)
  values (new.id, new.email, 'technician');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- WORK ORDERS
-- ============================================================
create table work_orders (
  id uuid primary key default uuid_generate_v4(),
  machine_id uuid not null references machines(id) on delete cascade,
  issue_type text not null,
  issue_description text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'pending_parts', 'closed')),
  assigned_to text,
  photo_url text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- ============================================================
-- PM SCHEDULES
-- ============================================================
create table pm_schedules (
  id uuid primary key default uuid_generate_v4(),
  machine_id uuid not null references machines(id) on delete cascade,
  task_description text not null,
  frequency_days integer not null default 30,
  next_due_date date not null,
  last_completed_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- DOWNTIME LOGS
-- ============================================================
create table downtime_logs (
  id uuid primary key default uuid_generate_v4(),
  machine_id uuid not null references machines(id) on delete cascade,
  reason text not null,
  notes text,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  duration_minutes integer,
  created_at timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger machines_updated_at
  before update on machines
  for each row execute procedure update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table machines enable row level security;
alter table work_orders enable row level security;
alter table pm_schedules enable row level security;
alter table downtime_logs enable row level security;
alter table user_profiles enable row level security;

-- Machines: authenticated users can read; admins can write
create policy "Authenticated users can view machines"
  on machines for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert machines"
  on machines for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update machines"
  on machines for update
  using (auth.role() = 'authenticated');

-- Work orders: authenticated users full access
create policy "Authenticated users can view work orders"
  on work_orders for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert work orders"
  on work_orders for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update work orders"
  on work_orders for update
  using (auth.role() = 'authenticated');

-- PM schedules: authenticated users full access
create policy "Authenticated users can view pm schedules"
  on pm_schedules for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert pm schedules"
  on pm_schedules for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update pm schedules"
  on pm_schedules for update
  using (auth.role() = 'authenticated');

-- Downtime logs: authenticated users full access
create policy "Authenticated users can view downtime logs"
  on downtime_logs for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert downtime logs"
  on downtime_logs for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update downtime logs"
  on downtime_logs for update
  using (auth.role() = 'authenticated');

-- User profiles: users can view all, update own
create policy "Authenticated users can view profiles"
  on user_profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on user_profiles for update
  using (auth.uid() = id);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table machines;
alter publication supabase_realtime add table work_orders;
alter publication supabase_realtime add table downtime_logs;

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_work_orders_machine_id on work_orders(machine_id);
create index idx_work_orders_status on work_orders(status);
create index idx_pm_schedules_machine_id on pm_schedules(machine_id);
create index idx_pm_schedules_next_due on pm_schedules(next_due_date);
create index idx_downtime_logs_machine_id on downtime_logs(machine_id);
create index idx_downtime_logs_start_time on downtime_logs(start_time);
