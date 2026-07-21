/*
# Create invoice_projects join table (many-to-many)

1. New Tables
- `invoice_projects` — junction table linking invoices to projects (many-to-many).
  - `invoice_id` (uuid, FK to invoices.id ON DELETE CASCADE)
  - `project_id` (uuid, FK to projects.id ON DELETE CASCADE)
  - `created_at` (timestamptz, default now())
  - Primary key on (invoice_id, project_id) to prevent duplicates.
2. Backfill
- Migrate existing single `invoices.project_id` values into the new join table so no existing links are lost.
3. Indexes
- Index on `project_id` for reverse lookups (all invoices for a project).
- Index on `invoice_id` for forward lookups (all projects for an invoice).
4. Security
- Enable RLS on `invoice_projects`.
- Admin (is_admin()) can read/insert/update/delete.
- Clients can read rows where the linked project belongs to them (matches existing projects read policy pattern: client_id = get_user_client_id()).
*/

CREATE TABLE IF NOT EXISTS invoice_projects (
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (invoice_id, project_id)
);

ALTER TABLE invoice_projects ENABLE ROW LEVEL SECURITY;

-- Backfill existing single project_id links into the join table (idempotent)
INSERT INTO invoice_projects (invoice_id, project_id)
SELECT id, project_id FROM invoices
WHERE project_id IS NOT NULL
ON CONFLICT (invoice_id, project_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_invoice_projects_project_id ON invoice_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_invoice_projects_invoice_id ON invoice_projects(invoice_id);

-- RLS: admin full CRUD
DROP POLICY IF EXISTS "Admin can read invoice_projects" ON invoice_projects;
CREATE POLICY "Admin can read invoice_projects"
  ON invoice_projects FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert invoice_projects" ON invoice_projects;
CREATE POLICY "Admin can insert invoice_projects"
  ON invoice_projects FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update invoice_projects" ON invoice_projects;
CREATE POLICY "Admin can update invoice_projects"
  ON invoice_projects FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete invoice_projects" ON invoice_projects;
CREATE POLICY "Admin can delete invoice_projects"
  ON invoice_projects FOR DELETE TO authenticated
  USING (is_admin());

-- RLS: clients can read links for their own projects
DROP POLICY IF EXISTS "Clients can read own invoice_projects" ON invoice_projects;
CREATE POLICY "Clients can read own invoice_projects"
  ON invoice_projects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = invoice_projects.project_id
        AND p.client_id = get_user_client_id()
    )
  );
