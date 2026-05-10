create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('super_admin', 'center_manager', 'center_user');
  end if;
end$$;

create table if not exists public.medical_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'center_user',
  center_id uuid references public.medical_centers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.medical_centers(id) on delete cascade,
  name text not null,
  clinic_type text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.medical_centers(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  entry_date date not null,
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year between 2000 and 2100),
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(center_id, clinic_id, entry_date)
);

create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.medical_centers(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year between 2000 and 2100),
  is_closed boolean not null default false,
  closed_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(center_id, clinic_id, month, year)
);

create table if not exists public.monthly_report_cells (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.monthly_reports(id) on delete cascade,
  report_date date not null,
  doctor_name text,
  patient_count integer not null default 0 check (patient_count >= 0),
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(report_id, report_date)
);

create index if not exists idx_profiles_center_id on public.profiles(center_id);
create index if not exists idx_clinics_center_id on public.clinics(center_id);
create index if not exists idx_daily_entries_center_clinic_date on public.daily_entries(center_id, clinic_id, entry_date);
create index if not exists idx_monthly_reports_center_clinic_month_year on public.monthly_reports(center_id, clinic_id, month, year);
create index if not exists idx_monthly_report_cells_report_date on public.monthly_report_cells(report_id, report_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_medical_centers_updated_at on public.medical_centers;
create trigger trg_medical_centers_updated_at
before update on public.medical_centers
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_clinics_updated_at on public.clinics;
create trigger trg_clinics_updated_at
before update on public.clinics
for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_entries_updated_at on public.daily_entries;
create trigger trg_daily_entries_updated_at
before update on public.daily_entries
for each row execute function public.set_updated_at();

drop trigger if exists trg_monthly_reports_updated_at on public.monthly_reports;
create trigger trg_monthly_reports_updated_at
before update on public.monthly_reports
for each row execute function public.set_updated_at();

drop trigger if exists trg_monthly_report_cells_updated_at on public.monthly_report_cells;
create trigger trg_monthly_report_cells_updated_at
before update on public.monthly_report_cells
for each row execute function public.set_updated_at();
