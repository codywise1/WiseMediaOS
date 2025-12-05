/*
  # Add payments table for transaction logging and reconciliation

  - Records payment transactions from providers (PayPal, Stripe, bank transfer)
  - Linked to invoices via invoice_id
  - RLS allows admins to see all; clients can see only payments for their invoices
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('paypal', 'stripe', 'bank_transfer')),
  provider_txn_id text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  payer_email text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_txn_id ON payments(provider_txn_id);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can view all payments
CREATE POLICY IF NOT EXISTS "Admin can read all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (is_admin());

-- Clients can view payments for their own invoices
CREATE POLICY IF NOT EXISTS "Clients can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.client_id = get_user_client_id()
    )
  );

-- Only admin can insert/update/delete (done via Edge Functions with service role)
CREATE POLICY IF NOT EXISTS "Admin can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY IF NOT EXISTS "Admin can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY IF NOT EXISTS "Admin can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (is_admin());
