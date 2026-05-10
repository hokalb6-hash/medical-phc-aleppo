alter table public.medical_centers enable row level security;
alter table public.profiles enable row level security;
alter table public.clinics enable row level security;
alter table public.daily_entries enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.monthly_report_cells enable row level security;
alter table if exists public.owner_daily_clinic_sheet enable row level security;
alter table if exists public.owner_monthly_summary_sheet enable row level security;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid() limit 1;
$$;

create or replace function public.current_center_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.center_id from public.profiles p where p.id = auth.uid() limit 1;
$$;

-- medical_centers
drop policy if exists "centers_select" on public.medical_centers;
create policy "centers_select"
on public.medical_centers
for select
using (
  public.current_role() = 'super_admin'
  or id = public.current_center_id()
);

drop policy if exists "centers_insert_super_admin" on public.medical_centers;
create policy "centers_insert_super_admin"
on public.medical_centers
for insert
with check (public.current_role() = 'super_admin');

drop policy if exists "centers_update_super_or_owner_manager" on public.medical_centers;
create policy "centers_update_super_or_owner_manager"
on public.medical_centers
for update
using (
  public.current_role() = 'super_admin'
  or (id = public.current_center_id() and public.current_role() = 'center_manager')
)
with check (
  public.current_role() = 'super_admin'
  or (id = public.current_center_id() and public.current_role() = 'center_manager')
);

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles
for select
using (
  id = auth.uid()
  or public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
  )
);

drop policy if exists "profiles_insert_super_or_manager" on public.profiles;
create policy "profiles_insert_super_or_manager"
on public.profiles
for insert
with check (
  public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
    and role = 'center_user'
  )
);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
using (
  id = auth.uid()
  or public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
    and role = 'center_user'
  )
)
with check (
  id = auth.uid()
  or public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
    and role = 'center_user'
  )
);

-- clinics
drop policy if exists "clinics_select" on public.clinics;
create policy "clinics_select"
on public.clinics
for select
using (
  public.current_role() = 'super_admin'
  or center_id = public.current_center_id()
);

drop policy if exists "clinics_insert_super_or_manager" on public.clinics;
create policy "clinics_insert_super_or_manager"
on public.clinics
for insert
with check (
  public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
  )
);

drop policy if exists "clinics_update_super_or_manager" on public.clinics;
create policy "clinics_update_super_or_manager"
on public.clinics
for update
using (
  public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
  )
)
with check (
  public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
  )
);

-- daily_entries
drop policy if exists "daily_entries_select" on public.daily_entries;
create policy "daily_entries_select"
on public.daily_entries
for select
using (
  public.current_role() = 'super_admin'
  or center_id = public.current_center_id()
);

drop policy if exists "daily_entries_insert_center_users" on public.daily_entries;
create policy "daily_entries_insert_center_users"
on public.daily_entries
for insert
with check (
  (
    public.current_role() in ('center_manager', 'center_user')
    and center_id = public.current_center_id()
    and created_by = auth.uid()
  )
  or public.current_role() = 'super_admin'
);

drop policy if exists "daily_entries_update_manager_or_owner" on public.daily_entries;
create policy "daily_entries_update_manager_or_owner"
on public.daily_entries
for update
using (
  public.current_role() = 'super_admin'
  or (
    center_id = public.current_center_id()
    and (
      public.current_role() = 'center_manager'
      or created_by = auth.uid()
    )
  )
)
with check (
  public.current_role() = 'super_admin'
  or center_id = public.current_center_id()
);

-- monthly_reports
drop policy if exists "monthly_reports_select" on public.monthly_reports;
create policy "monthly_reports_select"
on public.monthly_reports
for select
using (
  public.current_role() = 'super_admin'
  or center_id = public.current_center_id()
);

drop policy if exists "monthly_reports_insert_super_or_manager" on public.monthly_reports;
create policy "monthly_reports_insert_super_or_manager"
on public.monthly_reports
for insert
with check (
  public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
  )
);

drop policy if exists "monthly_reports_update_super_or_manager" on public.monthly_reports;
create policy "monthly_reports_update_super_or_manager"
on public.monthly_reports
for update
using (
  public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
  )
)
with check (
  public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
  )
);

-- monthly_report_cells
drop policy if exists "monthly_report_cells_select" on public.monthly_report_cells;
create policy "monthly_report_cells_select"
on public.monthly_report_cells
for select
using (
  exists (
    select 1
    from public.monthly_reports mr
    where mr.id = report_id
      and (
        public.current_role() = 'super_admin'
        or mr.center_id = public.current_center_id()
      )
  )
);

drop policy if exists "monthly_report_cells_insert_super_or_manager" on public.monthly_report_cells;
create policy "monthly_report_cells_insert_super_or_manager"
on public.monthly_report_cells
for insert
with check (
  exists (
    select 1
    from public.monthly_reports mr
    where mr.id = report_id
      and (
        public.current_role() = 'super_admin'
        or (
          public.current_role() = 'center_manager'
          and mr.center_id = public.current_center_id()
        )
      )
  )
);

drop policy if exists "monthly_report_cells_update_super_or_manager" on public.monthly_report_cells;
create policy "monthly_report_cells_update_super_or_manager"
on public.monthly_report_cells
for update
using (
  exists (
    select 1
    from public.monthly_reports mr
    where mr.id = report_id
      and (
        public.current_role() = 'super_admin'
        or (
          public.current_role() = 'center_manager'
          and mr.center_id = public.current_center_id()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.monthly_reports mr
    where mr.id = report_id
      and (
        public.current_role() = 'super_admin'
        or (
          public.current_role() = 'center_manager'
          and mr.center_id = public.current_center_id()
        )
      )
  )
);

-- owner_daily_clinic_sheet
drop policy if exists "owner_daily_sheet_select" on public.owner_daily_clinic_sheet;
create policy "owner_daily_sheet_select"
on public.owner_daily_clinic_sheet
for select
using (
  public.current_role() = 'super_admin'
  or center_id = public.current_center_id()
);

drop policy if exists "owner_daily_sheet_insert" on public.owner_daily_clinic_sheet;
create policy "owner_daily_sheet_insert"
on public.owner_daily_clinic_sheet
for insert
with check (
  public.current_role() = 'super_admin'
  or (
    public.current_role() in ('center_manager', 'center_user')
    and center_id = public.current_center_id()
    and created_by = auth.uid()
  )
);

drop policy if exists "owner_daily_sheet_update" on public.owner_daily_clinic_sheet;
create policy "owner_daily_sheet_update"
on public.owner_daily_clinic_sheet
for update
using (
  public.current_role() = 'super_admin'
  or (
    center_id = public.current_center_id()
    and (
      public.current_role() = 'center_manager'
      or created_by = auth.uid()
    )
  )
)
with check (
  public.current_role() = 'super_admin'
  or center_id = public.current_center_id()
);

-- owner_monthly_summary_sheet
drop policy if exists "owner_monthly_sheet_select" on public.owner_monthly_summary_sheet;
create policy "owner_monthly_sheet_select"
on public.owner_monthly_summary_sheet
for select
using (
  public.current_role() = 'super_admin'
  or center_id = public.current_center_id()
);

drop policy if exists "owner_monthly_sheet_insert" on public.owner_monthly_summary_sheet;
create policy "owner_monthly_sheet_insert"
on public.owner_monthly_summary_sheet
for insert
with check (
  public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
    and created_by = auth.uid()
  )
);

drop policy if exists "owner_monthly_sheet_update" on public.owner_monthly_summary_sheet;
create policy "owner_monthly_sheet_update"
on public.owner_monthly_summary_sheet
for update
using (
  public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
  )
)
with check (
  public.current_role() = 'super_admin'
  or (
    public.current_role() = 'center_manager'
    and center_id = public.current_center_id()
  )
);
