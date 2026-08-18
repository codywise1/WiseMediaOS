/*
# Add condition_label to clean_records

1. Purpose
   Cleaners need to label each clean record as "before clean", "after clean",
   or "damage" so management can track the state of a property at the time
   of the clean and flag issues.

2. Changes
   - clean_records: add column `condition_label` (text, nullable)
     Valid values: 'before', 'after', 'damage'. NULL means unlabeled.
     A CHECK constraint enforces the allowed values.
   - No security changes — the table already has RLS with full CRUD
     for authenticated users.

3. Notes
   - The column is nullable so existing rows are not affected.
   - The app will default new records to 'before' when no label is chosen.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clean_records' AND column_name = 'condition_label'
  ) THEN
    ALTER TABLE clean_records ADD COLUMN condition_label text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clean_records_condition_label_check'
  ) THEN
    ALTER TABLE clean_records
      ADD CONSTRAINT clean_records_condition_label_check
      CHECK (condition_label IS NULL OR condition_label IN ('before', 'after', 'damage'));
  END IF;
END $$;
