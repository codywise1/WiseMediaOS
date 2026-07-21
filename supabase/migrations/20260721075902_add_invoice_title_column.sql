/*
# Add title column to invoices

1. Modified Tables
- `invoices` — add `title` (text, nullable) so invoices can display a service/proposal-based
  title instead of using `description` as the de-facto title.
2. Backfill
- Set `title = description` for existing invoices that have a non-null description, so no
  invoice loses its display label.
3. Security
- No policy changes — the column inherits existing invoice RLS.
*/

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS title text;

UPDATE invoices
SET title = description
WHERE title IS NULL AND description IS NOT NULL;
