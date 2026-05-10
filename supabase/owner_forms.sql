create table if not exists public.owner_daily_clinic_sheet (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.medical_centers(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  entry_date date not null,
  doctor_name text,
  patient_count integer not null default 0 check (patient_count >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(center_id, clinic_id, entry_date)
);

create table if not exists public.owner_monthly_summary_sheet (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.medical_centers(id) on delete cascade,
  year smallint not null check (year between 2000 and 2100),
  month smallint not null check (month between 1 and 12),
  metrics jsonb not null default '{}'::jsonb,
  reviewers_total integer not null default 0 check (reviewers_total >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(center_id, year, month)
);

create index if not exists idx_owner_daily_sheet_center_date
  on public.owner_daily_clinic_sheet(center_id, entry_date);

create index if not exists idx_owner_monthly_sheet_center_year
  on public.owner_monthly_summary_sheet(center_id, year);

drop trigger if exists trg_owner_daily_sheet_updated_at on public.owner_daily_clinic_sheet;
create trigger trg_owner_daily_sheet_updated_at
before update on public.owner_daily_clinic_sheet
for each row execute function public.set_updated_at();

drop trigger if exists trg_owner_monthly_sheet_updated_at on public.owner_monthly_summary_sheet;
create trigger trg_owner_monthly_sheet_updated_at
before update on public.owner_monthly_summary_sheet
for each row execute function public.set_updated_at();
