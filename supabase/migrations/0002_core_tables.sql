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
