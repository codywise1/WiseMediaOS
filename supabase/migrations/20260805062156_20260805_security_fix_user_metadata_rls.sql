-- ============================================================
-- Replace all user_metadata-based RLS policies with
-- profiles-table lookups (user_metadata is user-editable)
-- ============================================================

-- ---- meetings ----
DROP POLICY IF EXISTS "Admins have full access" ON public.meetings;
DROP POLICY IF EXISTS "Staff have full access" ON public.meetings;
DROP POLICY IF EXISTS "Users can view their own meetings" ON public.meetings;

CREATE POLICY "meetings_admin_all" ON public.meetings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "meetings_client_select" ON public.meetings FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT c.id FROM public.clients c WHERE c.email = (auth.jwt() ->> 'email')
    )
  );


-- ---- meeting_recordings ----
DROP POLICY IF EXISTS "Admin/Staff full access recordings" ON public.meeting_recordings;

CREATE POLICY "recordings_admin_all" ON public.meeting_recordings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ---- meeting_transcripts ----
DROP POLICY IF EXISTS "Admin/Staff full access transcripts" ON public.meeting_transcripts;

CREATE POLICY "transcripts_admin_all" ON public.meeting_transcripts FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ---- meeting_summaries ----
DROP POLICY IF EXISTS "Admin/Staff full access summaries" ON public.meeting_summaries;

CREATE POLICY "summaries_admin_all" ON public.meeting_summaries FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ---- notes ----
DROP POLICY IF EXISTS "Admins and staff can read all notes" ON public.notes;
DROP POLICY IF EXISTS "Admins and staff can manage all notes" ON public.notes;

CREATE POLICY "notes_admin_read_all" ON public.notes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "notes_admin_manage_all" ON public.notes FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ---- note_audit_log ----
DROP POLICY IF EXISTS "Admins and staff can view audit logs" ON public.note_audit_log;
DROP POLICY IF EXISTS "Admins and staff can insert audit logs" ON public.note_audit_log;

CREATE POLICY "audit_log_admin_select" ON public.note_audit_log FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "audit_log_admin_insert" ON public.note_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = actor_id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
