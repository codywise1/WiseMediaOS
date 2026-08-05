-- ============================================================
-- Add policies for tables that have RLS enabled but no policies
-- (currently blocks ALL access, including legitimate use)
-- ============================================================

-- ai_logs: admin-only (internal AI usage logs)
CREATE POLICY "ai_logs_admin_all" ON public.ai_logs FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can insert their own log entries and read their own
CREATE POLICY "ai_logs_user_select" ON public.ai_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ai_logs_user_insert" ON public.ai_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- community_channels: all authenticated members can view; only admin can manage
CREATE POLICY "channels_select_authenticated" ON public.community_channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "channels_admin_manage" ON public.community_channels FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- conversations: participants can read; anyone authenticated can create
CREATE POLICY "conv_select_participant" ON public.conversations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(participants)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "conv_insert_own" ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = ANY(participants));

CREATE POLICY "conv_admin_all" ON public.conversations FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- referrals: users can see and create their own referrals; admin sees all
CREATE POLICY "referrals_select_own" ON public.referrals FOR SELECT
  TO authenticated
  USING (
    auth.uid() = referrer_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "referrals_insert_own" ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "referrals_admin_all" ON public.referrals FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- users (legacy table — admin only; app uses profiles table for primary access)
CREATE POLICY "users_admin_all" ON public.users FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "users_select_own" ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
