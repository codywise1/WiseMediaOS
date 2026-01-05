-- Fix invoice status check constraint
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'ready', 'pending', 'unpaid', 'paid', 'void', 'overdue', 'stale'));

-- Fix proposal status check constraint
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
ALTER TABLE public.proposals ADD CONSTRAINT proposals_status_check CHECK (status IN ('draft', 'sent', 'viewed', 'approved', 'declined', 'expired', 'archived', 'accepted', 'rejected'));

-- Add 'signed' to proposal_event_type enum safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'proposal_event_type' AND e.enumlabel = 'signed') THEN
    ALTER TYPE proposal_event_type ADD VALUE 'signed';
  END IF;
END $$;

-- Create RPC for secure proposal approval by clients
CREATE OR REPLACE FUNCTION public.approve_proposal(p_proposal_id uuid, p_signature text)
RETURNS void AS $$
DECLARE
  v_client_id uuid;
  v_total_cents int;
BEGIN
  -- 1. Get current user's client_id
  v_client_id := public.get_user_client_id();

  -- 2. Verify access (must be the client for this proposal or an admin)
  IF NOT (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM public.proposals WHERE id = p_proposal_id AND client_id = v_client_id)
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to approve this proposal';
  END IF;

  -- 3. Recalculate total cents from items to ensure accuracy
  SELECT COALESCE(SUM(line_total_cents), 0) INTO v_total_cents
  FROM public.proposal_items
  WHERE proposal_id = p_proposal_id;

  -- 4. Update proposal status
  UPDATE public.proposals 
  SET 
    status = 'approved', 
    approved_at = NOW(),
    value = v_total_cents
  WHERE id = p_proposal_id;

  -- 5. Update linked invoice if exists
  UPDATE public.invoices
  SET 
    status = 'ready', 
    locked_from_send = false,
    amount = v_total_cents / 100.0
  WHERE proposal_id = p_proposal_id;

  -- 6. Log events
  INSERT INTO public.proposal_events (proposal_id, type, meta, created_by_user_id)
  VALUES (p_proposal_id, 'signed', jsonb_build_object('signature', p_signature), auth.uid());

  INSERT INTO public.proposal_events (proposal_id, type, created_by_user_id)
  VALUES (p_proposal_id, 'approved', auth.uid());

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_proposal(uuid, text) TO authenticated;
