-- Allow 'solana' as a valid provider in payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE payments ADD CONSTRAINT payments_provider_check CHECK (provider IN ('paypal', 'stripe', 'bank_transfer', 'solana'));
