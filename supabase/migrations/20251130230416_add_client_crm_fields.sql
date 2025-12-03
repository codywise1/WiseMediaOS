/*
  # Add CRM Fields to Clients Table

  1. New Columns
    - `service_type` (text) - Type of service: Website, Branding, Retainer, Ads, Other
    - `client_tier` (text) - Client tier: Lead, Active, Past, VIP
    - `source` (text) - How client found us: Referral, Instagram, X, Repeat, Other

  2. Updates
    - Add 'archived' to status enum options
    - Update status check constraint to include 'archived'

  3. Notes
    - All new fields are nullable for backward compatibility
    - Existing clients will have null values for new fields
*/

-- Add new CRM fields to clients table
DO $$
BEGIN
  -- Add service_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE clients ADD COLUMN service_type text CHECK (service_type IN ('Website', 'Branding', 'Retainer', 'Ads', 'Other'));
  END IF;

  -- Add client_tier column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'client_tier'
  ) THEN
    ALTER TABLE clients ADD COLUMN client_tier text CHECK (client_tier IN ('Lead', 'Active', 'Past', 'VIP'));
  END IF;

  -- Add source column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'source'
  ) THEN
    ALTER TABLE clients ADD COLUMN source text CHECK (source IN ('Referral', 'Instagram', 'X', 'Repeat', 'Other'));
  END IF;
END $$;

-- Update status constraint to include 'archived'
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive', 'prospect', 'archived'));