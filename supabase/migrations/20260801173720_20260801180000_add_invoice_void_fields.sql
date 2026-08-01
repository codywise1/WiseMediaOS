/*
# Add void status support to invoices

1. New Columns
- `invoices.voided_at` (timestamptz, nullable) — timestamp marking when an
  invoice was voided. Stamped automatically by a trigger, never from the client.
- `invoices.void_reason` (text, nullable) — human-readable reason the invoice
  was voided (e.g. "Voided in Stripe — subscription cycle replaced").

2. Trigger
- `invoices_set_voided_at` — BEFORE INSERT/UPDATE trigger that auto-populates
  `voided_at = now()` whenever `status` transitions to 'void', and clears it
  to NULL whenever status moves away from 'void'. This enforces the
  server-side stamping requirement: the client cannot set voided_at directly.

3. Important notes
- The existing CHECK constraint on invoices.status already permits 'void'
  (along with draft, ready, pending, unpaid, paid, overdue, stale), so no
  constraint change is needed.
- NON-DESTRUCTIVE: no existing rows are modified. Existing invoices keep
  their current status. The two Stripe-voided invoices (INV-000106,
  INV-000103) will be set to 'void' manually after deploy.
- RLS policies on invoices are unchanged.
*/

-- Add voided_at column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'voided_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN voided_at timestamptz;
  END IF;
END $$;

-- Add void_reason column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'void_reason'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN void_reason text;
  END IF;
END $$;

-- Trigger function: auto-stamp voided_at when status becomes 'void',
-- clear it when status leaves 'void'. Ignore voided_at values sent by the
-- client so the timestamp is always server-authoritative.
CREATE OR REPLACE FUNCTION public.invoices_set_voided_at()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_invoices_set_voided_at ON public.invoices;
CREATE TRIGGER trg_invoices_set_voided_at
  BEFORE INSERT OR UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.invoices_set_voided_at();
