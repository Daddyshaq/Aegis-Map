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
