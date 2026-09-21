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
