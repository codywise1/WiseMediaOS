-- Update the approve_proposal RPC to handle invoice creation if one doesn't exist.
-- This ensures that when a client approves a proposal, an invoice is automatically generated.

CREATE OR REPLACE FUNCTION public.approve_proposal(p_proposal_id uuid, p_signature text)
RETURNS void AS $$
DECLARE
  v_client_id uuid;
  v_total_cents int;
  v_invoice_id uuid;
  v_proposal_title text;
BEGIN
  -- 1. Get proposal details and verify access
  SELECT client_id, title INTO v_client_id, v_proposal_title 
  FROM public.proposals 
  WHERE id = p_proposal_id;

  -- Verify access: must be the client for this proposal or an admin
  IF NOT (
    public.is_admin() OR 
    (v_client_id IS NOT NULL AND v_client_id = public.get_user_client_id())
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to approve this proposal';
  END IF;

  -- 2. Recalculate total cents from items to ensure accuracy
  SELECT COALESCE(SUM(line_total_cents), 0) INTO v_total_cents
  FROM public.proposal_items
  WHERE proposal_id = p_proposal_id;

  -- 3. Update proposal status
  UPDATE public.proposals 
  SET 
    status = 'approved', 
    approved_at = NOW(),
    value = v_total_cents
  WHERE id = p_proposal_id;

  -- 4. Handle invoice (Create if missing, update if exists)
  SELECT id INTO v_invoice_id FROM public.invoices WHERE proposal_id = p_proposal_id;

  IF v_invoice_id IS NOT NULL THEN
    -- Activate existing invoice
    UPDATE public.invoices
    SET 
      status = 'ready', 
      locked_from_send = false,
      amount = v_total_cents / 100.0
    WHERE id = v_invoice_id;
  ELSE
    -- Create new invoice on approval
    INSERT INTO public.invoices (
      client_id,
      proposal_id,
      amount,
      description,
      status,
      due_date,
      locked_from_send
    ) VALUES (
      v_client_id,
      p_proposal_id,
      v_total_cents / 100.0,
      'Proposal: ' || v_proposal_title,
      'ready',
      NOW() + INTERVAL '7 days',
      false
    ) RETURNING id INTO v_invoice_id;

    -- Mirror items from proposal to the new invoice
    INSERT INTO public.invoice_items (
      invoice_id,
      proposal_item_id,
      name,
      description,
      quantity,
      unit_price_cents,
      line_total_cents,
      sort_order
    )
    SELECT 
      v_invoice_id,
      id,
      name,
      description,
      quantity,
      unit_price_cents,
      line_total_cents,
      sort_order
    FROM public.proposal_items
    WHERE proposal_id = p_proposal_id;
  END IF;

  -- 5. Log events
  -- Log signature
  INSERT INTO public.proposal_events (proposal_id, type, meta, created_by_user_id)
  VALUES (p_proposal_id, 'signed', jsonb_build_object('signature', p_signature), auth.uid());

  -- Log approval
  INSERT INTO public.proposal_events (proposal_id, type, created_by_user_id)
  VALUES (p_proposal_id, 'approved', auth.uid());

  -- Log invoice activation
  IF v_invoice_id IS NOT NULL THEN
    INSERT INTO public.invoice_events (invoice_id, type, meta)
    VALUES (v_invoice_id, 'activated', jsonb_build_object('proposal_id', p_proposal_id));
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (redundant but good for clarity)
GRANT EXECUTE ON FUNCTION public.approve_proposal(uuid, text) TO authenticated;
