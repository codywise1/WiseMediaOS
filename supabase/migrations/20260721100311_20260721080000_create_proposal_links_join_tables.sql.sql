/*
# Create proposal_invoices + proposal_projects join tables (many-to-many)

1. New Tables
- `proposal_invoices` — junction linking proposals to invoices (many-to-many).
  - `proposal_id` (uuid, FK to proposals.id ON DELETE CASCADE)
  - `invoice_id` (uuid, FK to invoices.id ON DELETE CASCADE)
  - `created_at` (timestamptz, default now())
  - Primary key on (proposal_id, invoice_id) prevents duplicate links.
- `proposal_projects` — junction linking proposals to projects (many-to-many).
  - `proposal_id` (uuid, FK to proposals.id ON DELETE CASCADE)
  - `project_id` (uuid, FK to projects.id ON DELETE CASCADE)
  - `created_at` (timestamptz, default now())
  - Primary key on (proposal_id, project_id) prevents duplicate links.

2. Backfill
- Copy existing single links into the new join tables so no relationships are lost:
  - `invoices.proposal_id` (1:1) -> `proposal_invoices` rows.
  - `projects.invoice_link` (text, cast to uuid) -> the invoice's `proposal_id`
    -> `proposal_projects` rows.
  This is idempotent (ON CONFLICT DO NOTHING) and safe to re-run.

3. Indexes
- `proposal_invoices`: index on both `proposal_id` and `invoice_id`.
- `proposal_projects`: index on both `proposal_id` and `project_id`.

4. Security (RLS)
- Enable RLS on both join tables.
- Admin (is_admin()) can read/insert/update/delete all rows.
- Clients can read rows where the linked proposal belongs to them
  (proposal.client_id = get_user_client_id()), matching the existing proposals read policy.

5. Important Notes
- The legacy `invoices.proposal_id` column and `projects.invoice_link` column are NOT
  removed or altered — they remain for backwards compatibility. The new join tables
  are the source of truth going forward; the legacy columns are kept only so existing
  code paths don't break during the transition.
- Cascade deletes ensure that deleting a proposal, invoice, or project automatically
  cleans up orphaned join rows.
*/

CREATE TABLE IF NOT EXISTS proposal_invoices (
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (proposal_id, invoice_id)
);

ALTER TABLE proposal_invoices ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proposal_invoices_proposal_id ON proposal_invoices(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_invoices_invoice_id ON proposal_invoices(invoice_id);

CREATE TABLE IF NOT EXISTS proposal_projects (
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (proposal_id, project_id)
);

ALTER TABLE proposal_projects ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proposal_projects_proposal_id ON proposal_projects(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_projects_project_id ON proposal_projects(project_id);

-- Backfill: invoices.proposal_id -> proposal_invoices (idempotent)
INSERT INTO proposal_invoices (proposal_id, invoice_id)
SELECT proposal_id, id FROM invoices
WHERE proposal_id IS NOT NULL
ON CONFLICT (proposal_id, invoice_id) DO NOTHING;

-- Backfill: projects.invoice_link (text) -> cast to uuid -> invoice's proposal_id -> proposal_projects
-- Only backfill rows where invoice_link is a valid uuid and the invoice has a proposal_id.
INSERT INTO proposal_projects (proposal_id, project_id)
SELECT i.proposal_id, p.id
FROM projects p
JOIN invoices i ON i.id = p.invoice_link::uuid
WHERE i.proposal_id IS NOT NULL
  AND p.invoice_link ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT (proposal_id, project_id) DO NOTHING;

-- RLS: proposal_invoices -- admin full CRUD
DROP POLICY IF EXISTS "Admin can read proposal_invoices" ON proposal_invoices;
CREATE POLICY "Admin can read proposal_invoices"
  ON proposal_invoices FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert proposal_invoices" ON proposal_invoices;
CREATE POLICY "Admin can insert proposal_invoices"
  ON proposal_invoices FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update proposal_invoices" ON proposal_invoices;
CREATE POLICY "Admin can update proposal_invoices"
  ON proposal_invoices FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete proposal_invoices" ON proposal_invoices;
CREATE POLICY "Admin can delete proposal_invoices"
  ON proposal_invoices FOR DELETE TO authenticated
  USING (is_admin());

-- RLS: proposal_invoices -- clients can read links for their own proposals
DROP POLICY IF EXISTS "Clients can read own proposal_invoices" ON proposal_invoices;
CREATE POLICY "Clients can read own proposal_invoices"
  ON proposal_invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals pr
      WHERE pr.id = proposal_invoices.proposal_id
        AND pr.client_id = get_user_client_id()
    )
  );

-- RLS: proposal_projects -- admin full CRUD
DROP POLICY IF EXISTS "Admin can read proposal_projects" ON proposal_projects;
CREATE POLICY "Admin can read proposal_projects"
  ON proposal_projects FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert proposal_projects" ON proposal_projects;
CREATE POLICY "Admin can insert proposal_projects"
  ON proposal_projects FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update proposal_projects" ON proposal_projects;
CREATE POLICY "Admin can update proposal_projects"
  ON proposal_projects FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete proposal_projects" ON proposal_projects;
CREATE POLICY "Admin can delete proposal_projects"
  ON proposal_projects FOR DELETE TO authenticated
  USING (is_admin());

-- RLS: proposal_projects -- clients can read links for their own proposals
DROP POLICY IF EXISTS "Clients can read own proposal_projects" ON proposal_projects;
CREATE POLICY "Clients can read own proposal_projects"
  ON proposal_projects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals pr
      WHERE pr.id = proposal_projects.proposal_id
        AND pr.client_id = get_user_client_id()
    )
  );
