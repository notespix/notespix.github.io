-- =====================================================================
-- NotesPix database and storage security
-- ---------------------------------------------------------------------
-- Run this in the Supabase SQL Editor. It is safe to re-run.
--
-- What it does
--   1. Turns on Row Level Security (RLS) for every NotesPix table.
--   2. Recreates all access policies (old policies with the same names
--      are dropped first, so re-running never duplicates rules).
--   3. Creates the profile row for each new sign-up.
--   4. Locks Storage uploads/deletes to each user's own folder.
--   5. Restricts which columns of "profiles" are publicly readable.
--
-- Expected tables: profiles, resources, saved_resources, activity_log,
-- support_requests, resource_reports, admin_users.
-- Storage bucket: studyhub-resources (public read).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Helper used by admin policies
-- ---------------------------------------------------------------------
create or replace function public.notespix_is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- 2. profiles
--    Anyone signed out can only read the id, full_name and created_at
--    columns. The email column is never exposed to browsers.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
  on public.profiles for delete
  to authenticated
  using (public.notespix_is_admin());

revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, created_at) on public.profiles to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. resources
--    Public to read; only the owner (or an admin) can change or remove.
-- ---------------------------------------------------------------------
alter table public.resources enable row level security;

drop policy if exists "resources_public_read" on public.resources;
create policy "resources_public_read"
  on public.resources for select
  to anon, authenticated
  using (true);

drop policy if exists "resources_owner_insert" on public.resources;
create policy "resources_owner_insert"
  on public.resources for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "resources_owner_or_admin_update" on public.resources;
create policy "resources_owner_or_admin_update"
  on public.resources for update
  to authenticated
  using (owner_id = auth.uid() or public.notespix_is_admin())
  with check (owner_id = auth.uid() or public.notespix_is_admin());

drop policy if exists "resources_owner_or_admin_delete" on public.resources;
create policy "resources_owner_or_admin_delete"
  on public.resources for delete
  to authenticated
  using (owner_id = auth.uid() or public.notespix_is_admin());

create index if not exists resources_owner_id_idx on public.resources (owner_id);
create index if not exists resources_created_at_idx on public.resources (created_at desc);

-- ---------------------------------------------------------------------
-- 4. saved_resources
-- ---------------------------------------------------------------------
alter table public.saved_resources enable row level security;

drop policy if exists "saved_owner_read" on public.saved_resources;
create policy "saved_owner_read"
  on public.saved_resources for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "saved_owner_insert" on public.saved_resources;
create policy "saved_owner_insert"
  on public.saved_resources for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "saved_owner_delete" on public.saved_resources;
create policy "saved_owner_delete"
  on public.saved_resources for delete
  to authenticated
  using (user_id = auth.uid());

-- One save per user and resource. The app already treats duplicates as "saved".
drop index if exists saved_resources_user_resource_idx;
create unique index if not exists saved_resources_user_resource_idx
  on public.saved_resources (user_id, resource_id);

create index if not exists saved_resources_user_idx on public.saved_resources (user_id);

-- ---------------------------------------------------------------------
-- 5. activity_log
-- ---------------------------------------------------------------------
alter table public.activity_log enable row level security;

drop policy if exists "activity_owner_read" on public.activity_log;
create policy "activity_owner_read"
  on public.activity_log for select
  to authenticated
  using (user_id = auth.uid() or public.notespix_is_admin());

drop policy if exists "activity_owner_insert" on public.activity_log;
create policy "activity_owner_insert"
  on public.activity_log for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "activity_owner_delete" on public.activity_log;
create policy "activity_owner_delete"
  on public.activity_log for delete
  to authenticated
  using (user_id = auth.uid() or public.notespix_is_admin());

create index if not exists activity_log_user_created_idx
  on public.activity_log (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. support_requests
--    Users can create and read their own requests; admins manage them.
-- ---------------------------------------------------------------------
alter table public.support_requests enable row level security;

drop policy if exists "support_owner_read" on public.support_requests;
create policy "support_owner_read"
  on public.support_requests for select
  to authenticated
  using (user_id = auth.uid() or public.notespix_is_admin());

drop policy if exists "support_owner_insert" on public.support_requests;
create policy "support_owner_insert"
  on public.support_requests for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "support_admin_update" on public.support_requests;
create policy "support_admin_update"
  on public.support_requests for update
  to authenticated
  using (public.notespix_is_admin())
  with check (public.notespix_is_admin());

drop policy if exists "support_admin_delete" on public.support_requests;
create policy "support_admin_delete"
  on public.support_requests for delete
  to authenticated
  using (public.notespix_is_admin());

create index if not exists support_requests_status_idx on public.support_requests (status);

-- ---------------------------------------------------------------------
-- 7. resource_reports
-- ---------------------------------------------------------------------
alter table public.resource_reports enable row level security;

drop policy if exists "reports_owner_or_admin_read" on public.resource_reports;
create policy "reports_owner_or_admin_read"
  on public.resource_reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.notespix_is_admin());

drop policy if exists "reports_reporter_insert" on public.resource_reports;
create policy "reports_reporter_insert"
  on public.resource_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "reports_admin_update" on public.resource_reports;
create policy "reports_admin_update"
  on public.resource_reports for update
  to authenticated
  using (public.notespix_is_admin())
  with check (public.notespix_is_admin());

drop policy if exists "reports_admin_delete" on public.resource_reports;
create policy "reports_admin_delete"
  on public.resource_reports for delete
  to authenticated
  using (public.notespix_is_admin());

create index if not exists resource_reports_resource_idx on public.resource_reports (resource_id);
create index if not exists resource_reports_status_idx on public.resource_reports (status);

-- ---------------------------------------------------------------------
-- 8. admin_users
--    Members can see only their own membership row.
--    Rows are added by the project owner in the SQL Editor, for example:
--      insert into public.admin_users (user_id)
--      values ('00000000-0000-0000-0000-000000000000');
-- ---------------------------------------------------------------------
alter table public.admin_users enable row level security;

drop policy if exists "admin_self_read" on public.admin_users;
create policy "admin_self_read"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 9. Create the profile row for every new sign-up
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 10. Storage bucket "studyhub-resources"
--     Files are public to download, but uploads and deletions are
--     restricted to each user's own folder (user-id/file-name).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('studyhub-resources', 'studyhub-resources', true)
on conflict (id) do nothing;

drop policy if exists "studyhub_public_read" on storage.objects;
create policy "studyhub_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'studyhub-resources');

drop policy if exists "studyhub_owner_insert" on storage.objects;
create policy "studyhub_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'studyhub-resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "studyhub_owner_update" on storage.objects;
create policy "studyhub_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'studyhub-resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "studyhub_owner_delete" on storage.objects;
create policy "studyhub_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'studyhub-resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;

-- ---------------------------------------------------------------------
-- Verification (optional, safe to run after the script above)
-- ---------------------------------------------------------------------
-- List every policy that is now active:
--   select schemaname, tablename, policyname from pg_policies
--   where schemaname in ('public', 'storage') order by tablename;

-- Confirm RLS is enabled on every table:
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' order by tablename;

-- Add yourself as an administrator (replace the id with your auth.users id):
--   insert into public.admin_users (user_id)
--   values ('YOUR-USER-ID-HERE');
