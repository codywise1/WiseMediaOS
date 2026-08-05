-- ============================================================
-- Enable RLS and add policies for tables that had it disabled
-- ============================================================

-- course_progress: users own their own rows
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_select_own" ON public.course_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "cp_insert_own" ON public.course_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cp_update_own" ON public.course_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cp_delete_own" ON public.course_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Admin reads all progress
CREATE POLICY "cp_admin_all" ON public.course_progress FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- messages: participants in the conversation may read/write
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_select_participant" ON public.messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "msg_insert_participant" ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)
      )
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "msg_delete_own" ON public.messages FOR DELETE
  TO authenticated
  USING (
    auth.uid() = sender_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- billing_plan_schedule_items: admin only (internal billing data)
ALTER TABLE public.billing_plan_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bpsi_admin_all" ON public.billing_plan_schedule_items FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- clients can see their own schedule items via billing_plan_id -> invoices -> client_id
CREATE POLICY "bpsi_client_select" ON public.billing_plan_schedule_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.billing_plans bp ON bp.id = billing_plan_id
      WHERE i.id = billing_plan_schedule_items.invoice_id
        AND i.client_id = auth.uid()
    )
  );


-- proposal_events: admin sees all; clients see events on their own proposals
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pe_admin_all" ON public.proposal_events FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "pe_client_select" ON public.proposal_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_id
        AND p.client_id = auth.uid()
    )
  );

CREATE POLICY "pe_insert_own" ON public.proposal_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by_user_id);


-- invoice_events: admin sees all; clients see events on their own invoices
ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ie_admin_all" ON public.invoice_events FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "ie_client_select" ON public.invoice_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.client_id = auth.uid()
    )
  );

CREATE POLICY "ie_insert_own" ON public.invoice_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by_user_id OR created_by_user_id IS NULL);
