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
