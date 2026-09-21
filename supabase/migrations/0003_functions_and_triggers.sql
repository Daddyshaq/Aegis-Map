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
