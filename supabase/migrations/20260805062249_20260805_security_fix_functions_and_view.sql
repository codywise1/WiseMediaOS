-- ============================================================
-- 1. Fix the purchases view: remove SECURITY DEFINER property
-- ============================================================
DROP VIEW IF EXISTS public.purchases;
CREATE VIEW public.purchases
  WITH (security_invoker = true)
AS
  SELECT
    id,
    user_id,
    product_id,
    amount_paid AS amount,
    payment_method,
    purchased_at AS created_at
  FROM public.product_purchases;

-- Grant same access as before (authenticated users see their own rows via product_purchases RLS)
GRANT SELECT ON public.purchases TO authenticated;


-- ============================================================
-- 2. Add SET search_path = public to all SECURITY DEFINER
--    functions that were missing it, and fix is_admin /
--    is_staff_or_admin to use profiles table instead of
--    user_metadata
-- ============================================================

-- is_admin: use profiles table, not user_metadata
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- is_staff_or_admin: now just admin (staff role removed)
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN public.is_admin();
END;
$$;

-- handle_new_user: add search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');

  IF v_role IN ('free', 'pro', 'elite', 'staff') THEN
    v_role := 'member';
  ELSIF v_role = 'user' THEN
    v_role := 'client';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    v_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role       = EXCLUDED.role,
    updated_at = NOW();

  IF v_role = 'client' THEN
    INSERT INTO public.clients (id, name, email, phone, status, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET
      name       = COALESCE(EXCLUDED.name, clients.name),
      phone      = COALESCE(EXCLUDED.phone, clients.phone),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- get_user_client_id: add search_path
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  client_uuid uuid;
BEGIN
  SELECT id INTO client_uuid
  FROM public.clients
  WHERE email = (auth.jwt() ->> 'email');
  RETURN client_uuid;
END;
$$;

-- approve_proposal: add search_path
CREATE OR REPLACE FUNCTION public.approve_proposal(p_proposal_id uuid, p_signature text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_total_cents int;
  v_invoice_id uuid;
  v_proposal_title text;
BEGIN
  SELECT client_id, title INTO v_client_id, v_proposal_title
  FROM public.proposals
  WHERE id = p_proposal_id;

  IF NOT (
    public.is_admin()
    OR (v_client_id IS NOT NULL AND v_client_id = public.get_user_client_id())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(SUM(line_total_cents), 0) INTO v_total_cents
  FROM public.proposal_items
  WHERE proposal_id = p_proposal_id;

  UPDATE public.proposals
  SET status = 'approved', approved_at = NOW(), value = v_total_cents
  WHERE id = p_proposal_id;

  SELECT id INTO v_invoice_id FROM public.invoices WHERE proposal_id = p_proposal_id;

  IF v_invoice_id IS NOT NULL THEN
    UPDATE public.invoices
    SET status = 'ready', locked_from_send = false, amount = v_total_cents / 100.0
    WHERE id = v_invoice_id;
  ELSE
    INSERT INTO public.invoices (
      client_id, proposal_id, amount, description, status, due_date, locked_from_send
    ) VALUES (
      v_client_id, p_proposal_id, v_total_cents / 100.0,
      'Proposal: ' || v_proposal_title, 'ready',
      NOW() + INTERVAL '7 days', false
    ) RETURNING id INTO v_invoice_id;

    INSERT INTO public.invoice_items (
      invoice_id, proposal_item_id, name, description,
      quantity, unit_price_cents, line_total_cents, sort_order
    )
    SELECT v_invoice_id, id, name, description,
           quantity, unit_price_cents, line_total_cents, sort_order
    FROM public.proposal_items
    WHERE proposal_id = p_proposal_id;
  END IF;

  INSERT INTO public.proposal_events (proposal_id, type, meta, created_by_user_id)
  VALUES (p_proposal_id, 'signed', jsonb_build_object('signature', p_signature), auth.uid());

  INSERT INTO public.proposal_events (proposal_id, type, created_by_user_id)
  VALUES (p_proposal_id, 'approved', auth.uid());

  IF v_invoice_id IS NOT NULL THEN
    INSERT INTO public.invoice_events (invoice_id, type, meta)
    VALUES (v_invoice_id, 'activated', jsonb_build_object('proposal_id', p_proposal_id));
  END IF;
END;
$$;

-- sync_client_name_to_profile: add search_path
CREATE OR REPLACE FUNCTION public.sync_client_name_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET full_name = NEW.name, updated_at = now()
  WHERE email = NEW.email;
  RETURN NEW;
END;
$$;

-- Non-SECURITY-DEFINER trigger functions: just add search_path (still safer)
CREATE OR REPLACE FUNCTION public.set_notes_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'INSERT' AND NEW.created_at IS NULL THEN
    NEW.created_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calc_line_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.line_total_cents = (NEW.unit_price_cents * NEW.quantity)::int;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_proposals_public_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
    NEW.public_id := 'PROP-' || lpad(nextval('proposals_public_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_invoices_public_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
    NEW.public_id := 'INV-' || lpad(nextval('invoices_public_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.invoices_set_voided_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'void' THEN
    IF (TG_OP = 'INSERT' OR COALESCE(OLD.status, '') <> 'void') THEN
      NEW.voided_at := now();
    END IF;
  ELSE
    IF COALESCE(OLD.status, '') = 'void' THEN
      NEW.voided_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================
-- 3. Revoke anon EXECUTE from SECURITY DEFINER functions
--    that should only be callable by authenticated users or
--    fired by triggers (not via RPC by anonymous callers)
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.approve_proposal(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_client_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_profile_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_client_name_to_profile() FROM anon;

-- approve_proposal is intentionally callable by authenticated clients (to sign proposals)
GRANT EXECUTE ON FUNCTION public.approve_proposal(uuid, text) TO authenticated;
-- get_user_client_id used internally but safe for authenticated calls
GRANT EXECUTE ON FUNCTION public.get_user_client_id() TO authenticated;
-- is_admin used in RLS policies (called by supabase internally), keep authenticated access
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;
