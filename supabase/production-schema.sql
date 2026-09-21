-- =============================================================================
-- Aegis Map — Complete Consolidated Production Schema
-- Generated automatically from supabase/migrations/
-- 
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Open the SQL Editor and click "New query"
-- 3. Paste this entire file and click "Run" (or execute via psql / supabase CLI)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- START FILE: 0001_extensions_and_enums.sql
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 0001 — Extensions and enumerated types
-- =============================================================================

create extension if not exists "pgcrypto";     -- gen_random_uuid, digest
create extension if not exists "postgis";       -- spatial types & indexes
create extension if not exists "citext";        -- case-insensitive email

-- Domain enums (mirrored by @crisis/types).
do $$ begin
  create type public.app_role as enum ('citizen', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('ACTIVE', 'SUSPENDED', 'BANNED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.severity as enum ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum
    ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.crisis_status as enum ('ACTIVE', 'CONTAINED', 'RESOLVED', 'EXPIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_level as enum ('UNKNOWN', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.safe_location_type as enum
    ('SHELTER', 'HOSPITAL', 'POLICE', 'FIRE_STATION', 'EVACUATION_CENTER', 'RELIEF_CENTER', 'OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.operating_status as enum ('OPEN', 'LIMITED', 'FULL', 'CLOSED', 'UNKNOWN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alert_type as enum ('EMERGENCY', 'WARNING', 'ADVISORY', 'ANNOUNCEMENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.evidence_kind as enum ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');
exception when duplicate_object then null; end $$;




-- -----------------------------------------------------------------------------
-- START FILE: 0002_core_tables.sql
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 0002 — Core tables, spatial columns and indexes
-- =============================================================================

-- Profiles: one row per auth user. Mirrors auth.users(id).
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          citext,
  full_name      text,
  phone          text,
  avatar_url     text,
  role           public.app_role not null default 'citizen',
  account_status public.account_status not null default 'ACTIVE',
  reputation     integer not null default 50 check (reputation between 0 and 100),
  data_saver     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Database-driven crisis categories.
create table if not exists public.crisis_categories (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  description       text,
  icon              text not null default 'alert-triangle',
  color             text not null default '#dc2626',
  default_ttl_hours integer not null default 48 check (default_ttl_hours > 0),
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Crisis reports (incidents).
create table if not exists public.crisis_reports (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique,
  category_id         uuid not null references public.crisis_categories (id) on delete restrict,
  title               text not null check (char_length(title) between 1 and 160),
  description         text not null check (char_length(description) between 1 and 5000),
  severity            public.severity not null default 'MODERATE',
  status              public.crisis_status not null default 'ACTIVE',
  verification_status public.verification_status not null default 'PENDING',
  lat                 double precision not null check (lat between -90 and 90),
  lng                 double precision not null check (lng between -180 and 180),
  geog                geography(Point, 4326),
  location_name       text,
  corroboration_count integer not null default 0 check (corroboration_count >= 0),
  risk_level          public.risk_level not null default 'UNKNOWN',
  risk_score          integer not null default 0 check (risk_score between 0 and 100),
  reported_by         uuid references public.profiles (id) on delete set null,
  is_anonymous        boolean not null default false,
  verified_by         uuid references public.profiles (id) on delete set null,
  verification_notes  text,
  duplicate_of_id     uuid references public.crisis_reports (id) on delete set null,
  reported_at         timestamptz not null default now(),
  verified_at         timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Evidence files (stored in a private Storage bucket; only paths kept here).
create table if not exists public.crisis_evidence (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.crisis_reports (id) on delete cascade,
  kind         public.evidence_kind not null,
  storage_path text not null,
  mime_type    text not null,
  size_bytes   bigint not null check (size_bytes > 0),
  created_at   timestamptz not null default now()
);

-- Immutable-ish moderation trail per report.
create table if not exists public.crisis_verifications (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid not null references public.crisis_reports (id) on delete cascade,
  moderator_id    uuid not null references public.profiles (id) on delete restrict,
  action          text not null,
  notes           text,
  previous_status public.verification_status,
  new_status      public.verification_status,
  created_at      timestamptz not null default now()
);

-- Safe locations.
create table if not exists public.safe_locations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  type                public.safe_location_type not null default 'OTHER',
  lat                 double precision not null check (lat between -90 and 90),
  lng                 double precision not null check (lng between -180 and 180),
  geog                geography(Point, 4326),
  address             text,
  phone               text,
  capacity            integer check (capacity >= 0),
  operating_status    public.operating_status not null default 'UNKNOWN',
  verification_status public.verification_status not null default 'VERIFIED',
  opening_hours       text,
  facilities          text[] not null default '{}',
  is_active           boolean not null default true,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Emergency alerts / official announcements.
create table if not exists public.alerts (
  id           uuid primary key default gen_random_uuid(),
  type         public.alert_type not null default 'WARNING',
  title        text not null,
  body         text not null,
  severity     public.severity not null default 'HIGH',
  center_lat   double precision check (center_lat between -90 and 90),
  center_lng   double precision check (center_lng between -180 and 180),
  geog         geography(Point, 4326),
  radius_km    double precision check (radius_km > 0),
  is_active    boolean not null default true,
  published_by uuid not null references public.profiles (id) on delete restrict,
  published_at timestamptz not null default now(),
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- In-app notifications.
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text not null,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id               uuid primary key references public.profiles (id) on delete cascade,
  emergency_alerts      boolean not null default true,
  nearby_crisis_alerts  boolean not null default true,
  report_status_updates boolean not null default true,
  safe_location_updates boolean not null default false,
  system_notifications  boolean not null default true,
  min_severity          public.severity not null default 'HIGH',
  radius_km             double precision not null default 10 check (radius_km > 0),
  push_enabled          boolean not null default false,
  updated_at            timestamptz not null default now()
);

create table if not exists public.saved_locations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  label      text not null,
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  address    text,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- Append-only audit log.
create table if not exists public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references public.profiles (id) on delete set null,
  actor_role     text,
  action         text not null,
  resource_type  text not null,
  resource_id    text,
  metadata       jsonb not null default '{}'::jsonb,
  previous_value jsonb,
  new_value      jsonb,
  ip_hash        text,
  created_at     timestamptz not null default now()
);

create table if not exists public.system_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- Admin-editable emergency/survival guidance (CMS-like).
create table if not exists public.emergency_guides (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  summary       text not null,
  content       text not null,
  icon          text not null default 'book-open',
  category_slug text,
  sort_order    integer not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_reports_geog on public.crisis_reports using gist (geog);
create index if not exists idx_reports_category on public.crisis_reports (category_id);
create index if not exists idx_reports_status on public.crisis_reports (verification_status);
create index if not exists idx_reports_crisis_status on public.crisis_reports (status);
create index if not exists idx_reports_severity on public.crisis_reports (severity);
create index if not exists idx_reports_reported_at on public.crisis_reports (reported_at desc);
create index if not exists idx_reports_expires_at on public.crisis_reports (expires_at);
create index if not exists idx_reports_reported_by on public.crisis_reports (reported_by);

create index if not exists idx_evidence_report on public.crisis_evidence (report_id);
create index if not exists idx_verifications_report on public.crisis_verifications (report_id);
create index if not exists idx_verifications_moderator on public.crisis_verifications (moderator_id);

create index if not exists idx_safe_geog on public.safe_locations using gist (geog);
create index if not exists idx_safe_type on public.safe_locations (type);
create index if not exists idx_safe_active on public.safe_locations (is_active);

create index if not exists idx_alerts_active on public.alerts (is_active);
create index if not exists idx_alerts_geog on public.alerts using gist (geog);

create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (user_id) where read_at is null;

create index if not exists idx_saved_user on public.saved_locations (user_id);
create index if not exists idx_push_user on public.push_subscriptions (user_id);

create index if not exists idx_audit_actor on public.audit_logs (actor_id, created_at desc);
create index if not exists idx_audit_resource on public.audit_logs (resource_type, resource_id);
create index if not exists idx_guides_published on public.emergency_guides (is_published, sort_order);




-- -----------------------------------------------------------------------------
-- START FILE: 0003_functions_and_triggers.sql
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 0003 — Functions and triggers
-- =============================================================================

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Sync the PostGIS geography column from a lat/lng pair on write. The coordinate
-- column names are passed per-trigger via TG_ARGV, so the same function serves
-- tables that name them differently (crisis_reports/safe_locations use lat/lng;
-- alerts uses center_lat/center_lng). Reading them through to_jsonb(NEW) keeps
-- the function agnostic to the triggering table's row type.
create or replace function public.sync_geog()
returns trigger language plpgsql as $$
declare
  lat_col text := coalesce(TG_ARGV[0], 'lat');
  lng_col text := coalesce(TG_ARGV[1], 'lng');
  rec     jsonb := to_jsonb(new);
  v_lat   double precision := (rec ->> lat_col)::double precision;
  v_lng   double precision := (rec ->> lng_col)::double precision;
begin
  if v_lat is not null and v_lng is not null then
    new.geog := ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)::geography;
  else
    new.geog := null;
  end if;
  return new;
end $$;

-- Generate a short human-friendly reference like CR-8F2A1B.
create or replace function public.gen_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := 'CR-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  end if;
  return new;
end $$;

-- Role helpers used by RLS. SECURITY DEFINER so policies can read the caller's
-- role without recursively triggering profile RLS.
create or replace function public.current_role()
returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_moderator()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('moderator', 'admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.account_active()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select account_status = 'ACTIVE' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Create a profile + default notification prefs when a new auth user appears.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Attach triggers
-- ---------------------------------------------------------------------------
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated on public.crisis_categories;
create trigger trg_categories_updated before update on public.crisis_categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reports_updated on public.crisis_reports;
create trigger trg_reports_updated before update on public.crisis_reports
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reports_geog on public.crisis_reports;
create trigger trg_reports_geog before insert or update of lat, lng on public.crisis_reports
  for each row execute function public.sync_geog('lat', 'lng');

drop trigger if exists trg_reports_reference on public.crisis_reports;
create trigger trg_reports_reference before insert on public.crisis_reports
  for each row execute function public.gen_reference();

drop trigger if exists trg_safe_updated on public.safe_locations;
create trigger trg_safe_updated before update on public.safe_locations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_safe_geog on public.safe_locations;
create trigger trg_safe_geog before insert or update of lat, lng on public.safe_locations
  for each row execute function public.sync_geog('lat', 'lng');

drop trigger if exists trg_alerts_updated on public.alerts;
create trigger trg_alerts_updated before update on public.alerts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_alerts_geog on public.alerts;
create trigger trg_alerts_geog before insert or update of center_lat, center_lng on public.alerts
  for each row execute function public.sync_geog('center_lat', 'center_lng');

drop trigger if exists trg_guides_updated on public.emergency_guides;
create trigger trg_guides_updated before update on public.emergency_guides
  for each row execute function public.set_updated_at();

-- Attach to auth.users (idempotent).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Spatial query functions consumed by the API
-- ---------------------------------------------------------------------------

-- Active, non-rejected reports within a bounding box (used by the map).
create or replace function public.reports_in_bbox(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision
)
returns setof public.crisis_reports
language sql stable set search_path = public as $$
  select *
  from public.crisis_reports r
  where r.lat between min_lat and max_lat
    and r.lng between min_lng and max_lng
    and r.verification_status <> 'REJECTED'
    and r.status <> 'RESOLVED'
    and (r.expires_at is null or r.expires_at > now());
$$;

-- Nearest active safe locations to a point, ordered by distance.
create or replace function public.nearby_safe_locations(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision
)
returns table (
  id uuid, name text, description text, type public.safe_location_type,
  lat double precision, lng double precision, address text, phone text,
  capacity integer, operating_status public.operating_status,
  verification_status public.verification_status, opening_hours text,
  facilities text[], is_active boolean, created_by uuid,
  created_at timestamptz, updated_at timestamptz, distance_meters double precision
)
language sql stable set search_path = public as $$
  select s.id, s.name, s.description, s.type, s.lat, s.lng, s.address, s.phone,
         s.capacity, s.operating_status, s.verification_status, s.opening_hours,
         s.facilities, s.is_active, s.created_by, s.created_at, s.updated_at,
         ST_Distance(s.geog, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) as distance_meters
  from public.safe_locations s
  where s.is_active
    and ST_DWithin(s.geog, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_meters asc;
$$;

-- Count reports near a point (used for corroboration / nearby-crisis alerts).
create or replace function public.reports_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_min_severity public.severity default 'LOW'
)
returns setof public.crisis_reports
language sql stable set search_path = public as $$
  select r.*
  from public.crisis_reports r
  where r.verification_status in ('PENDING', 'UNDER_REVIEW', 'VERIFIED')
    and r.status = 'ACTIVE'
    and (r.expires_at is null or r.expires_at > now())
    and (case r.severity
           when 'CRITICAL' then 4 when 'HIGH' then 3 when 'MODERATE' then 2 else 1 end)
        >= (case p_min_severity
           when 'CRITICAL' then 4 when 'HIGH' then 3 when 'MODERATE' then 2 else 1 end)
    and ST_DWithin(r.geog, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m);
$$;

-- Expire aged-out incidents. Invoked by a scheduled job or the API.
create or replace function public.expire_stale_reports()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  affected integer;
begin
  update public.crisis_reports
    set verification_status = 'EXPIRED',
        status = 'EXPIRED',
        risk_level = 'UNKNOWN',
        risk_score = 0
  where expires_at is not null
    and expires_at <= now()
    and verification_status not in ('REJECTED', 'EXPIRED');
  get diagnostics affected = row_count;
  return affected;
end $$;




-- -----------------------------------------------------------------------------
-- START FILE: 0004_rls.sql
-- -----------------------------------------------------------------------------

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




-- -----------------------------------------------------------------------------
-- START FILE: 0005_realtime_and_storage.sql
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 0005 — Realtime publication and Storage buckets
-- =============================================================================

-- Publish the tables clients subscribe to. RLS still governs what each
-- subscriber actually receives.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.crisis_reports;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.safe_locations;
alter publication supabase_realtime add table public.notifications;

-- Ensure UPDATE/DELETE events carry enough identity for clients.
alter table public.crisis_reports replica identity full;
alter table public.alerts replica identity full;
alter table public.notifications replica identity full;

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('crisis-evidence', 'crisis-evidence', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Evidence bucket (PRIVATE): authenticated users may upload only into their own
-- folder ({uid}/...). Reading is via short-lived signed URLs minted by the API
-- after an authorization check; the service role handles moderator access.
drop policy if exists evidence_insert_own on storage.objects;
create policy evidence_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'crisis-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists evidence_select_own on storage.objects;
create policy evidence_select_own on storage.objects for select to authenticated
  using (
    bucket_id = 'crisis-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists evidence_delete_own on storage.objects;
create policy evidence_delete_own on storage.objects for delete to authenticated
  using (
    bucket_id = 'crisis-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars bucket (PUBLIC read): owners manage their own folder.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_write_own on storage.objects;
create policy avatars_write_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );




-- -----------------------------------------------------------------------------
-- START FILE: 0006_baseline_data.sql
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 0006 — Baseline reference data (categories, settings, guides)
-- Idempotent; runs in every environment. Distinct from dev seed data.
-- =============================================================================

insert into public.crisis_categories (slug, name, description, icon, color, default_ttl_hours, sort_order)
values
  ('flooding',            'Flooding',            'Rising water, flash floods and waterlogging.',        'waves',          '#2563eb', 72,  10),
  ('road-accident',       'Road accident',       'Vehicle collisions and road hazards.',                'car-front',      '#ea580c', 12,  20),
  ('civil-unrest',        'Civil unrest',        'Protests, riots and public disorder.',                'megaphone',      '#dc2626', 24,  30),
  ('community-clash',     'Community clash',     'Inter-community or communal violence.',               'users',          '#b91c1c', 48,  40),
  ('religious-conflict',  'Religious conflict',  'Conflict along religious lines.',                     'landmark',       '#9333ea', 48,  50),
  ('kidnapping',          'Kidnapping',          'Abduction or kidnapping incidents.',                  'user-x',         '#7f1d1d', 96,  60),
  ('banditry',            'Banditry',            'Armed robbery and banditry.',                         'swords',         '#991b1b', 72,  70),
  ('insurgency',          'Insurgency',          'Insurgent or terrorist activity.',                    'shield-alert',   '#450a0a', 168, 80),
  ('natural-disaster',    'Natural disaster',    'Earthquakes, storms and other natural hazards.',      'tornado',        '#0d9488', 96,  90),
  ('fire',                'Fire',                'Structural, bush or industrial fires.',               'flame',          '#f97316', 24,  100),
  ('other',               'Other emergency',     'Any other emergency not listed above.',               'triangle-alert', '#6b7280', 48,  999)
on conflict (slug) do nothing;

insert into public.system_settings (key, value, description)
values
  ('risk.recency_half_life_hours', '12'::jsonb, 'Half-life (hours) for risk recency decay.'),
  ('reports.default_radius_km', '10'::jsonb, 'Default nearby-alert radius in km.'),
  ('reports.throttle_per_hour', '8'::jsonb, 'Max reports a citizen may file per hour.'),
  ('duplicate.radius_meters', '750'::jsonb, 'Duplicate-detection search radius (m).'),
  ('duplicate.window_minutes', '120'::jsonb, 'Duplicate-detection time window (min).'),
  ('routing.hazard_buffer_meters', '500'::jsonb, 'Route hazard proximity buffer (m).')
on conflict (key) do nothing;

insert into public.emergency_guides (slug, title, summary, content, icon, category_slug, sort_order, is_published)
values
  (
    'flooding-safety',
    'What to do during flooding',
    'Move to higher ground, avoid floodwater, and never drive through it.',
    E'## Before\n- Know your area''s flood risk and evacuation routes.\n- Keep an emergency kit (water, torch, documents) ready.\n\n## During\n- Move immediately to higher ground.\n- **Do not** walk or drive through moving water — 15 cm can knock you over; 60 cm can float a car.\n- Disconnect electrical appliances if safe to do so.\n\n## After\n- Avoid floodwater — it may be contaminated or electrically charged.\n- Follow guidance from local authorities before returning home.',
    'waves',
    'flooding',
    10,
    true
  ),
  (
    'fire-safety',
    'What to do during a fire',
    'Get out, stay out, and call emergency services.',
    E'## Immediately\n- Alert everyone and get out fast; stay low under smoke.\n- Feel doors with the back of your hand — do not open if hot.\n\n## Escaping\n- Use stairs, never lifts.\n- If trapped, seal gaps with cloth and signal from a window.\n\n## Once out\n- Call emergency services. **Never** re-enter a burning building.',
    'flame',
    'fire',
    20,
    true
  ),
  (
    'civil-unrest-safety',
    'What to do during civil unrest',
    'Stay indoors, avoid crowds, and keep informed through official channels.',
    E'## Stay safe\n- Remain indoors and away from windows if unrest is nearby.\n- Avoid protests, crowds and confrontations.\n\n## If caught outside\n- Move calmly away from the crowd, toward a safe building.\n- Do not run unless in immediate danger — it can attract attention.\n\n## Communication\n- Rely on official channels; avoid spreading unverified information.',
    'megaphone',
    'civil-unrest',
    30,
    true
  ),
  (
    'road-accident-response',
    'What to do at a road accident',
    'Secure the scene, call for help, and give first aid only if trained.',
    E'## Secure the scene\n- Switch on hazard lights; place a warning triangle if available.\n- Keep yourself and others away from traffic.\n\n## Get help\n- Call emergency services with the exact location.\n- Report the number of people involved and any hazards (fuel, fire).\n\n## Assist\n- Do not move the seriously injured unless there is fire or immediate danger.\n- Provide first aid only if trained.',
    'car-front',
    'road-accident',
    40,
    true
  ),
  (
    'kidnapping-awareness',
    'Kidnapping threat awareness',
    'Vary routines, stay alert, and share your location with trusted contacts.',
    E'## Reduce risk\n- Vary your routes and routines; avoid predictable patterns.\n- Share your live location with trusted family or friends.\n\n## If threatened\n- Prioritise your safety; comply to avoid escalation.\n- Try to remember details (vehicles, voices, directions).\n\n## Report\n- Contact security agencies as soon as it is safe.\n- Report the incident on Aegis Map to warn others in the area.',
    'user-x',
    'kidnapping',
    50,
    true
  ),
  (
    'general-preparedness',
    'General emergency preparedness',
    'Build a kit, make a plan, and keep emergency contacts handy.',
    E'## Emergency kit\n- Water, non-perishable food, torch, radio, batteries.\n- First-aid supplies and essential medication.\n- Copies of important documents.\n\n## Family plan\n- Agree on meeting points and out-of-area contacts.\n- Practise your evacuation route.\n\n## Stay informed\n- Enable Aegis Map alerts for your area and severity threshold.',
    'life-buoy',
    null,
    60,
    true
  )
on conflict (slug) do nothing;




-- -----------------------------------------------------------------------------
-- START FILE: 0007_admin_functions.sql
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 0007 — Admin dashboard aggregation
-- =============================================================================
-- A single-round-trip stats function for the admin dashboard. Executed by the
-- API under the service role; direct RPC access by anon/authenticated is
-- revoked so it cannot be used to enumerate aggregate data.

create or replace function public.admin_dashboard_stats()
returns jsonb
language sql
stable
set search_path = public
as $$
  with counts as (
    select
      count(*)                                                          as total_reports,
      count(*) filter (where verification_status = 'PENDING')           as pending,
      count(*) filter (where verification_status = 'UNDER_REVIEW')      as under_review,
      count(*) filter (where verification_status = 'VERIFIED')          as verified,
      count(*) filter (where verification_status = 'REJECTED')          as rejected,
      count(*) filter (where verification_status = 'EXPIRED')           as expired,
      count(*) filter (where status = 'ACTIVE')                         as active_crises,
      count(*) filter (where severity = 'CRITICAL' and status = 'ACTIVE') as critical
    from public.crisis_reports
  ),
  by_category as (
    select coalesce(c.slug, 'unknown') as category_slug, count(r.*) as count
    from public.crisis_reports r
    left join public.crisis_categories c on c.id = r.category_id
    group by c.slug
    order by count desc
  ),
  by_severity as (
    select severity::text as severity, count(*) as count
    from public.crisis_reports
    group by severity
  ),
  by_status as (
    select verification_status::text as status, count(*) as count
    from public.crisis_reports
    group by verification_status
  ),
  over_time as (
    select to_char(d::date, 'YYYY-MM-DD') as date, count(r.id) as count
    from generate_series((now() - interval '13 days')::date, now()::date, interval '1 day') d
    left join public.crisis_reports r on r.reported_at::date = d::date
    group by d
    order by d
  ),
  median as (
    select percentile_cont(0.5) within group (
             order by extract(epoch from (verified_at - reported_at)) / 60
           ) as m
    from public.crisis_reports
    where verified_at is not null
  )
  select jsonb_build_object(
    'totalReports',        (select total_reports from counts),
    'pendingReports',      (select pending from counts),
    'underReviewReports',  (select under_review from counts),
    'verifiedReports',     (select verified from counts),
    'rejectedReports',     (select rejected from counts),
    'expiredReports',      (select expired from counts),
    'activeCrises',        (select active_crises from counts),
    'criticalIncidents',   (select critical from counts),
    'activeAlerts',        (select count(*) from public.alerts
                             where is_active and (expires_at is null or expires_at > now())),
    'safeLocations',       (select count(*) from public.safe_locations where is_active),
    'totalUsers',          (select count(*) from public.profiles),
    'reportsByCategory',   coalesce((select jsonb_agg(jsonb_build_object('categorySlug', category_slug, 'count', count)) from by_category), '[]'::jsonb),
    'reportsBySeverity',   coalesce((select jsonb_agg(jsonb_build_object('severity', severity, 'count', count)) from by_severity), '[]'::jsonb),
    'reportsByStatus',     coalesce((select jsonb_agg(jsonb_build_object('status', status, 'count', count)) from by_status), '[]'::jsonb),
    'reportsOverTime',     coalesce((select jsonb_agg(jsonb_build_object('date', date, 'count', count)) from over_time), '[]'::jsonb),
    'medianVerificationMinutes', (select case when m is null then null else round(m) end from median)
  );
$$;

revoke all on function public.admin_dashboard_stats() from public;
revoke all on function public.admin_dashboard_stats() from anon;
revoke all on function public.admin_dashboard_stats() from authenticated;
grant execute on function public.admin_dashboard_stats() to service_role;



