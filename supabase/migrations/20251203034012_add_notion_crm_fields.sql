/*
  # Add Notion CRM Fields to Clients Table

  1. New Columns
    - `first_name` (text) - Contact's first name separate from company
    - `category` (text) - Business category/industry
    - `location` (text) - Geographic location/city
    - `services_requested` (text array) - List of services the client needs

  2. Changes
    - Add new columns to clients table with default values
    - Update existing records to handle nullable fields
    - Maintain backward compatibility

  3. Notes
    - All new fields are optional to maintain backward compatibility
    - services_requested uses text array for multiple services
*/

-- Add new columns to clients table
DO $$
BEGIN
  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE clients ADD COLUMN first_name text;
  END IF;

  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'category'
  ) THEN
    ALTER TABLE clients ADD COLUMN category text;
  END IF;

  -- Add location column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'location'
  ) THEN
    ALTER TABLE clients ADD COLUMN location text;
  END IF;

  -- Add services_requested column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'services_requested'
  ) THEN
    ALTER TABLE clients ADD COLUMN services_requested text[] DEFAULT '{}';
  END IF;
END $$;
