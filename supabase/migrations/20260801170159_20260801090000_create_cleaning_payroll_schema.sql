/*
# Create Cleaning & Payroll Schema for Wise STR

1. Purpose
   This migration adds the cleaning-team management and payroll tables
   for the Wise STR (short-term-rental) operations module. Cleaners
   (team members) are tracked, each completed clean is recorded, and
   payroll cards are generated from clean records.

2. New Tables

   a) cleaners — the cleaning team members
      - id (uuid, primary key)
      - name (text, not null) — full name
      - email (text)
      - phone (text)
      - pay_type (text) — 'hourly' or 'flat_rate'
      - hourly_rate (numeric) — used when pay_type = 'hourly'
      - flat_rate_per_clean (numeric) — used when pay_type = 'flat_rate'
      - status (text) — 'active' or 'inactive'
      - created_at (timestamptz)

   b) clean_records — individual completed cleans
      - id (uuid, primary key)
      - cleaner_id (uuid, FK → cleaners.id ON DELETE CASCADE)
      - clean_date (date, not null) — the DATE the clean was performed
      - hours_worked (numeric) — hours worked (nullable for flat-rate cleans)
      - property_name (text) — which property was cleaned
      - notes (text)
      - pay_amount (numeric) — calculated pay for this clean
      - status (text) — 'pending', 'paid'
      - created_at (timestamptz) — when the record was entered (issue date)

   c) payroll_periods — payroll card summaries per cleaner per period
      - id (uuid, primary key)
      - cleaner_id (uuid, FK → cleaners.id ON DELETE CASCADE)
      - period_start (date)
      - period_end (date)
      - total_cleans (integer)
      - total_hours (numeric)
      - total_pay (numeric)
      - status (text) — 'pending', 'paid'
      - paid_date (date)
      - created_at (timestamptz)

3. Security
   - RLS enabled on all three tables.
   - Policies allow authenticated admin/staff users full CRUD (the app
     has a sign-in screen and the admin manages payroll).
*/

-- Cleaners table
CREATE TABLE IF NOT EXISTS cleaners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  pay_type text NOT NULL DEFAULT 'hourly' CHECK (pay_type IN ('hourly', 'flat_rate')),
  hourly_rate numeric DEFAULT 0,
  flat_rate_per_clean numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_cleaners" ON cleaners;
CREATE POLICY "select_cleaners" ON cleaners FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_cleaners" ON cleaners;
CREATE POLICY "insert_cleaners" ON cleaners FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_cleaners" ON cleaners;
CREATE POLICY "update_cleaners" ON cleaners FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_cleaners" ON cleaners;
CREATE POLICY "delete_cleaners" ON cleaners FOR DELETE
  TO authenticated USING (true);

-- Clean records table
CREATE TABLE IF NOT EXISTS clean_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id uuid NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  clean_date date NOT NULL,
  hours_worked numeric,
  property_name text,
  notes text,
  pay_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clean_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_clean_records" ON clean_records;
CREATE POLICY "select_clean_records" ON clean_records FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_clean_records" ON clean_records;
CREATE POLICY "insert_clean_records" ON clean_records FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_clean_records" ON clean_records;
CREATE POLICY "update_clean_records" ON clean_records FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_clean_records" ON clean_records;
CREATE POLICY "delete_clean_records" ON clean_records FOR DELETE
  TO authenticated USING (true);

-- Payroll periods table
CREATE TABLE IF NOT EXISTS payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id uuid NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  period_start date,
  period_end date,
  total_cleans integer DEFAULT 0,
  total_hours numeric DEFAULT 0,
  total_pay numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_date date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payroll_periods" ON payroll_periods;
CREATE POLICY "select_payroll_periods" ON payroll_periods FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_payroll_periods" ON payroll_periods;
CREATE POLICY "insert_payroll_periods" ON payroll_periods FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_payroll_periods" ON payroll_periods;
CREATE POLICY "update_payroll_periods" ON payroll_periods FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_payroll_periods" ON payroll_periods;
CREATE POLICY "delete_payroll_periods" ON payroll_periods FOR DELETE
  TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clean_records_cleaner_id ON clean_records(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_clean_records_clean_date ON clean_records(clean_date);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_cleaner_id ON payroll_periods(cleaner_id);

-- Seed sample cleaners matching the screenshot
INSERT INTO cleaners (name, email, phone, pay_type, hourly_rate, flat_rate_per_clean, status)
VALUES
  ('Melissa Juarez', 'melissa@wisestr.com', '(305) 555-0101', 'hourly', 25.00, 0, 'active'),
  ('Lindelly Herrera', 'lindelly@wisestr.com', '(305) 555-0102', 'flat_rate', 0, 80.00, 'active'),
  ('Jessica Gorsedin', 'jessica@wisestr.com', '(305) 555-0103', 'hourly', 22.00, 0, 'active'),
  ('Anastasia Rivera', 'anastasia@wisestr.com', '(305) 555-0104', 'flat_rate', 0, 75.00, 'active')
ON CONFLICT DO NOTHING;

-- Seed sample clean records (using clean_date, NOT created_at, for payroll sync)
INSERT INTO clean_records (cleaner_id, clean_date, hours_worked, property_name, notes, pay_amount, status)
SELECT c.id, '2026-07-28', 4.5, 'Ocean Drive Unit 12', 'Turnover clean', 112.50, 'pending'
FROM cleaners c WHERE c.name = 'Melissa Juarez'
ON CONFLICT DO NOTHING;

INSERT INTO clean_records (cleaner_id, clean_date, hours_worked, property_name, notes, pay_amount, status)
SELECT c.id, '2026-07-28', NULL, 'South Beach Condo 5B', 'Flat rate clean', 80.00, 'pending'
FROM cleaners c WHERE c.name = 'Lindelly Herrera'
ON CONFLICT DO NOTHING;

INSERT INTO clean_records (cleaner_id, clean_date, hours_worked, property_name, notes, pay_amount, status)
SELECT c.id, '2026-07-29', 3.0, 'Wynwood Studio 3', 'Checkout clean', 66.00, 'pending'
FROM cleaners c WHERE c.name = 'Jessica Gorsedin'
ON CONFLICT DO NOTHING;

INSERT INTO clean_records (cleaner_id, clean_date, hours_worked, property_name, notes, pay_amount, status)
SELECT c.id, '2026-07-29', NULL, 'Brickell Loft 8A', 'Flat rate clean', 75.00, 'pending'
FROM cleaners c WHERE c.name = 'Anastasia Rivera'
ON CONFLICT DO NOTHING;