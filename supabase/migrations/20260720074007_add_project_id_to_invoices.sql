/*
# Add project_id to invoices table

1. Modified Tables
   - `invoices` — adds `project_id` (uuid, nullable FK to projects)
     This lets an invoice be linked to a specific project so the invoice
     description/title can sync bidirectionally with the project name.

2. Important Notes
   - Column is nullable — existing invoices are unaffected.
   - Foreign key uses ON DELETE SET NULL so deleting a project does not
     cascade-delete linked invoices.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE invoices
      ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
