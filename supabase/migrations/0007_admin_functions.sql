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
