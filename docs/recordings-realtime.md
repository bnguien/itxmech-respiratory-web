# Recording updates via Supabase Realtime

Visit pages subscribe to INSERT and UPDATE on `public.recordings`, filtered by `visit_id=eq.<visitId>`, even when the visit has no recording. Events invalidate the existing recording GET endpoint; its response then invalidates the saved analysis GET endpoint. Payloads never replace API responses and no event starts AI inference. Recording detail pages use the same mechanism filtered by recording ID. No polling is used.

Each mounted view owns one channel. Cleanup removes it and ignores late callbacks; changes of visit also reset local UI state. Pending GETs are aborted when invalidated. Subscription/reconnection success refetches state to cover missed events. Connection errors show a manual refresh option. Realtime uses the existing authenticated browser client and publishable key.

## Database deployment

Apply migration `0009_recordings_realtime.sql` through the normal migration process. Earlier migrations revoked all authenticated access to recordings, which prevents Postgres Changes delivery. This migration grants SELECT only and adds a doctor-profile-backed RLS policy, consistent with shared doctor access in the backend. Anonymous clients and browser writes remain denied. It also adds recordings to the `supabase_realtime` publication. The existing primary key is sufficient for INSERT/UPDATE invalidation; full old-row replica identity is not needed.

Check the deployed database:

```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'recordings';
SELECT pubinsert, pubupdate FROM pg_publication WHERE pubname = 'supabase_realtime';
SELECT policyname, roles, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'recordings';
SELECT has_table_privilege('authenticated', 'public.recordings', 'SELECT');
```

With a signed-in doctor whose `doctor_profiles` row exists, open a visit without a recording, run the firmware simulator, and watch waiting-upload → analyzing → completed without reload. The network panel should show a Realtime subscription and event-driven GETs rather than repeated timer requests. Completed results should display the waveform and stored cycles. Navigate away and confirm channel cleanup.

Local automated tests simulate this sequence and exercise the publication/RLS migration in PGlite. Live Supabase delivery and firmware verification require applying the migration and testing against the configured services; local tests do not verify deployed configuration.
