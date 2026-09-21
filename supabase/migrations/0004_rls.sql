-- =============================================================================
-- 0004 — Row Level Security
--
-- Model: the browser (anon/authenticated) may only READ appropriately-scoped
-- rows and manage its own personal rows. All privileged writes (report
-- submission, moderation, admin, alerts, categories) flow through the Node API
-- using the service role, which bypasses RLS but enforces RBAC in code.
-- =============================================================================

-- Table-level grants (RLS still filters rows).
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on
  public.saved_locations,
  public.push_subscriptions,
  public.notification_preferences,
  public.notifications
  to authenticated;
grant update on public.profiles to authenticated;
grant execute on all functions in schema public to anon, authenticated;

alter default privileges in schema public grant select on tables to anon, authenticated;

-- The server-only service role (used by the API via SUPABASE_SERVICE_ROLE_KEY)
-- performs every privileged read/write and bypasses RLS; it is never exposed to
-- the browser. Grant it full access to current and future objects, mirroring the
-- Supabase platform default so the API can operate regardless of RLS policies.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- Enable RLS everywhere.
alter table public.profiles                enable row level security;
alter table public.crisis_categories       enable row level security;
alter table public.crisis_reports          enable row level security;
alter table public.crisis_evidence         enable row level security;
alter table public.crisis_verifications    enable row level security;
alter table public.safe_locations          enable row level security;
alter table public.alerts                  enable row level security;
alter table public.notifications           enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.saved_locations         enable row level security;
alter table public.push_subscriptions      enable row level security;
alter table public.audit_logs              enable row level security;
alter table public.system_settings         enable row level security;
alter table public.emergency_guides        enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_moderator());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Prevent citizens/moderators from escalating their own role or lifting a
-- suspension. Privileged fields (role/account_status/reputation) may only be
-- changed by trusted server contexts:
--   * the API's service role, identified via the request JWT (auth.role());
--   * a direct connection as a privileged DB role (postgres / supabase_admin)
--     or any superuser -- used by migrations, the dev seed, and admin SQL.
-- These roles own the schema and can bypass this trigger anyway, so trusting
-- them adds no privilege; it only lets the seed provision the initial
-- admin/moderator accounts. Browser roles (anon/authenticated) can never
-- change these fields.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
declare
  is_trusted boolean;
begin
  is_trusted :=
       coalesce(auth.role() = 'service_role', false)
    or current_user in ('postgres', 'supabase_admin')
    or coalesce(current_setting('is_superuser', true) = 'on', false);

  if not is_trusted then
    if new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.reputation is distinct from old.reputation then
      raise exception 'Not authorized to modify privileged profile fields';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_protect on public.profiles;
create trigger trg_profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- crisis_categories
-- ---------------------------------------------------------------------------
drop policy if exists categories_select on public.crisis_categories;
create policy categories_select on public.crisis_categories for select
  using (is_active or public.is_moderator());

-- ---------------------------------------------------------------------------
-- crisis_reports — public sees everything except others' rejected reports.
-- ---------------------------------------------------------------------------
drop policy if exists reports_select on public.crisis_reports;
create policy reports_select on public.crisis_reports for select
  using (
    verification_status <> 'REJECTED'
    or reported_by = auth.uid()
    or public.is_moderator()
  );

-- ---------------------------------------------------------------------------
-- crisis_evidence — reporter (own) and moderators only.
-- ---------------------------------------------------------------------------
drop policy if exists evidence_select on public.crisis_evidence;
create policy evidence_select on public.crisis_evidence for select
  using (
    public.is_moderator()
    or exists (
      select 1 from public.crisis_reports r
      where r.id = report_id and r.reported_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- crisis_verifications — moderators/admins only.
-- ---------------------------------------------------------------------------
drop policy if exists verifications_select on public.crisis_verifications;
create policy verifications_select on public.crisis_verifications for select
  using (public.is_moderator());

-- ---------------------------------------------------------------------------
-- safe_locations
-- ---------------------------------------------------------------------------
drop policy if exists safe_select on public.safe_locations;
create policy safe_select on public.safe_locations for select
  using (is_active or public.is_moderator());

-- ---------------------------------------------------------------------------
-- alerts
-- ---------------------------------------------------------------------------
drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts for select
  using (is_active or public.is_moderator());

-- ---------------------------------------------------------------------------
-- notifications — owner only (read + mark-as-read).
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notification_preferences — owner only.
-- ---------------------------------------------------------------------------
drop policy if exists prefs_select on public.notification_preferences;
create policy prefs_select on public.notification_preferences for select
  using (user_id = auth.uid());

drop policy if exists prefs_upsert on public.notification_preferences;
create policy prefs_upsert on public.notification_preferences for insert
  with check (user_id = auth.uid());

drop policy if exists prefs_update on public.notification_preferences;
create policy prefs_update on public.notification_preferences for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- saved_locations — full owner CRUD.
-- ---------------------------------------------------------------------------
drop policy if exists saved_all on public.saved_locations;
create policy saved_all on public.saved_locations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- push_subscriptions — full owner CRUD.
-- ---------------------------------------------------------------------------
drop policy if exists push_all on public.push_subscriptions;
create policy push_all on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- audit_logs — moderators/admins read; nobody writes via the anon/auth roles.
-- ---------------------------------------------------------------------------
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs for select
  using (public.is_moderator());

-- ---------------------------------------------------------------------------
-- system_settings — admins only.
-- ---------------------------------------------------------------------------
drop policy if exists settings_select on public.system_settings;
create policy settings_select on public.system_settings for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- emergency_guides — published visible to all; drafts to moderators.
-- ---------------------------------------------------------------------------
drop policy if exists guides_select on public.emergency_guides;
create policy guides_select on public.emergency_guides for select
  using (is_published or public.is_moderator());
