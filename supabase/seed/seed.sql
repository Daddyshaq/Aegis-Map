-- =============================================================================
-- Development seed data — DO NOT run against production.
-- Creates test auth users, sample incidents, safe locations and alerts.
--
-- Test accounts (password for all: "Password123"):
--   admin@aegismap.dev      (admin)
--   moderator@aegismap.dev  (moderator)
--   citizen@aegismap.dev    (citizen)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Auth users (local dev only). The on_auth_user_created trigger creates the
-- matching profiles + notification preferences.
-- ---------------------------------------------------------------------------
-- GoTrue scans several token columns into non-nullable Go strings, so they must
-- be '' (not NULL) or password login fails with "Database error querying schema"
-- / "converting NULL to string is unsupported". We set the four that default to
-- NULL; the rest already default to ''.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'admin@aegismap.dev',
   crypt('Password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Ada Admin"}', now(), now(),
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'moderator@aegismap.dev',
   crypt('Password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Musa Moderator"}', now(), now(),
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'citizen@aegismap.dev',
   crypt('Password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Chidi Citizen"}', now(), now(),
   '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities
  (provider_id, user_id, identity_data, provider, created_at, updated_at, id)
values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@aegismap.dev"}', 'email', now(), now(), gen_random_uuid()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"moderator@aegismap.dev"}', 'email', now(), now(), gen_random_uuid()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"citizen@aegismap.dev"}', 'email', now(), now(), gen_random_uuid())
on conflict (provider_id, provider) do nothing;

-- Promote roles (profiles were auto-created by the trigger as 'citizen').
update public.profiles set role = 'admin',     full_name = 'Ada Admin'       where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set role = 'moderator', full_name = 'Musa Moderator'  where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'citizen',   full_name = 'Chidi Citizen'   where id = '33333333-3333-3333-3333-333333333333';

-- ---------------------------------------------------------------------------
-- Sample crisis reports (Nigeria). geog + reference are set by triggers.
-- ---------------------------------------------------------------------------
insert into public.crisis_reports
  (category_id, title, description, severity, status, verification_status, lat, lng,
   location_name, corroboration_count, risk_level, risk_score, reported_by, is_anonymous,
   verified_by, verified_at, reported_at, expires_at)
select c.id, v.title, v.description, v.severity::public.severity, 'ACTIVE'::public.crisis_status,
       v.vstatus::public.verification_status, v.lat, v.lng, v.location_name, v.corr,
       v.risk_level::public.risk_level, v.risk_score, v.reported_by::uuid, v.is_anon,
       v.verified_by::uuid, v.verified_at, v.reported_at, v.expires_at
from (values
  ('flooding',       'Severe flooding on Airport Road', 'Water has covered both lanes near the junction; vehicles are stranded.', 'HIGH', 'VERIFIED', 9.0055, 7.4655, 'Airport Road, Abuja', 3, 'HIGH', 72, '22222222-2222-2222-2222-222222222222', false, '22222222-2222-2222-2222-222222222222', now() - interval '30 min', now() - interval '2 hour', now() + interval '70 hour'),
  ('road-accident',  'Multi-vehicle collision at Berger', 'Tanker and two cars collided; road partially blocked.', 'MODERATE', 'UNDER_REVIEW', 9.0765, 7.3986, 'Berger Junction, Abuja', 1, 'MODERATE', 30, '33333333-3333-3333-3333-333333333333', false, null, null, now() - interval '40 min', now() + interval '11 hour'),
  ('civil-unrest',   'Protest gathering downtown', 'A large crowd is gathering; avoid the central district.', 'MODERATE', 'PENDING', 9.0579, 7.4951, 'Central Business District, Abuja', 0, 'MODERATE', 18, '33333333-3333-3333-3333-333333333333', false, null, null, now() - interval '15 min', now() + interval '24 hour'),
  ('kidnapping',     'Reported abduction on Kaduna road', 'Unconfirmed report of an abduction attempt near the toll gate.', 'CRITICAL', 'VERIFIED', 10.5105, 7.4165, 'Kaduna Expressway', 2, 'CRITICAL', 90, '22222222-2222-2222-2222-222222222222', false, '22222222-2222-2222-2222-222222222222', now() - interval '1 hour', now() - interval '3 hour', now() + interval '93 hour'),
  ('fire',           'Market fire spreading fast', 'Fire has broken out in the main market; several stalls affected.', 'HIGH', 'PENDING', 6.4531, 3.3958, 'Balogun Market, Lagos', 0, 'HIGH', 40, null, true, null, null, now() - interval '10 min', now() + interval '24 hour'),
  ('banditry',       'Armed robbery on the highway', 'Travellers report armed men stopping vehicles.', 'HIGH', 'VERIFIED', 9.8965, 8.8583, 'Jos–Bauchi Road', 4, 'HIGH', 78, '22222222-2222-2222-2222-222222222222', false, '22222222-2222-2222-2222-222222222222', now() - interval '20 min', now() - interval '90 min', now() + interval '70 hour'),
  ('community-clash','Communal tension reported', 'Rising tension between neighbouring communities.', 'MODERATE', 'UNDER_REVIEW', 9.9285, 8.8921, 'Jos North', 1, 'MODERATE', 28, '33333333-3333-3333-3333-333333333333', false, null, null, now() - interval '55 min', now() + interval '48 hour'),
  ('flooding',       'Waterlogging in residential area', 'Streets flooded after heavy rain; some homes affected.', 'LOW', 'VERIFIED', 6.5244, 3.3792, 'Lagos Mainland', 0, 'LOW', 12, null, true, '22222222-2222-2222-2222-222222222222', now() - interval '5 hour', now() - interval '6 hour', now() + interval '66 hour')
) as v(cat_slug, title, description, severity, vstatus, lat, lng, location_name, corr, risk_level, risk_score, reported_by, is_anon, verified_by, verified_at, reported_at, expires_at)
join public.crisis_categories c on c.slug = v.cat_slug;

-- ---------------------------------------------------------------------------
-- Sample safe locations. geog is set by trigger.
-- ---------------------------------------------------------------------------
insert into public.safe_locations
  (name, description, type, lat, lng, address, phone, capacity, operating_status, opening_hours, facilities, created_by)
values
  ('National Hospital Abuja', 'Major referral hospital.', 'HOSPITAL', 9.0578, 7.4894, 'Central District, Abuja', '+2348000000001', 500, 'OPEN', '24/7', array['medical','emergency','ambulance'], '11111111-1111-1111-1111-111111111111'),
  ('Abuja Central Police Station', 'Main police division.', 'POLICE', 9.0645, 7.4892, 'Garki, Abuja', '+2348000000002', null, 'OPEN', '24/7', array['security'], '11111111-1111-1111-1111-111111111111'),
  ('Federal Fire Service HQ', 'Fire and rescue headquarters.', 'FIRE_STATION', 9.0331, 7.4869, 'Central Area, Abuja', '+2348000000003', null, 'OPEN', '24/7', array['fire','rescue'], '11111111-1111-1111-1111-111111111111'),
  ('Eagle Square Evacuation Point', 'Designated open-space evacuation area.', 'EVACUATION_CENTER', 9.0405, 7.4913, 'Eagle Square, Abuja', null, 5000, 'OPEN', 'Daylight hours', array['open-space','assembly'], '11111111-1111-1111-1111-111111111111'),
  ('Red Cross Relief Center', 'Relief supplies and first aid.', 'RELIEF_CENTER', 9.0512, 7.4712, 'Wuse, Abuja', '+2348000000004', 300, 'LIMITED', 'Mon–Sat 8am–6pm', array['water','food','first-aid'], '11111111-1111-1111-1111-111111111111'),
  ('Lagos General Hospital', 'Public hospital on the mainland.', 'HOSPITAL', 6.5099, 3.3720, 'Lagos Island', '+2348000000005', 400, 'OPEN', '24/7', array['medical','emergency'], '11111111-1111-1111-1111-111111111111'),
  ('Jos University Teaching Hospital', 'Referral hospital in Jos.', 'HOSPITAL', 9.8611, 8.8583, 'Jos, Plateau', '+2348000000006', 350, 'OPEN', '24/7', array['medical','emergency'], '11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Sample alerts. geog is set by trigger.
-- ---------------------------------------------------------------------------
insert into public.alerts (type, title, body, severity, center_lat, center_lng, radius_km, published_by, expires_at)
values
  ('WARNING', 'Flood warning — Abuja', 'Heavy rainfall expected. Avoid low-lying areas and Airport Road.', 'HIGH', 9.0055, 7.4655, 15, '11111111-1111-1111-1111-111111111111', now() + interval '24 hour'),
  ('ADVISORY', 'Security advisory — Kaduna Expressway', 'Exercise caution when travelling; report suspicious activity.', 'MODERATE', 10.5105, 7.4165, 40, '11111111-1111-1111-1111-111111111111', now() + interval '48 hour');

-- ---------------------------------------------------------------------------
-- Sample personal data for the citizen account.
-- ---------------------------------------------------------------------------
insert into public.saved_locations (user_id, label, lat, lng, address)
values ('33333333-3333-3333-3333-333333333333', 'Home', 9.0765, 7.3986, 'Wuse II, Abuja');

insert into public.notifications (user_id, type, title, body, data)
values
  ('33333333-3333-3333-3333-333333333333', 'REPORT_RECEIVED', 'Report received',
   'Your report of a multi-vehicle collision at Berger has been received and is awaiting review.', '{}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'EMERGENCY_ALERT', 'Flood warning — Abuja',
   'Heavy rainfall expected. Avoid low-lying areas and Airport Road.', '{}'::jsonb);
