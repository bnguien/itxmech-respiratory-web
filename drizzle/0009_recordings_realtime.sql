-- Device writes continue through server-only APIs. Realtime needs SELECT only.
GRANT SELECT ON TABLE public.recordings TO authenticated;
--> statement-breakpoint
CREATE POLICY "Doctors can receive recording changes"
ON public.recordings FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())
));
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'recordings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recordings;
  END IF;
END $$;
