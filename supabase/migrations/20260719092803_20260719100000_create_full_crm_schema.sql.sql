/*
# Create full CRM schema (consolidated)

This migration creates the complete CRM schema that the frontend expects.
It consolidates multiple pending migrations into one idempotent migration:
- Base tables: clients, projects, invoices, proposals, appointments, support_tickets
- Proposal system: proposal_items, invoice_items, payments, clauses, service_clause_map,
  proposal_clause_snapshots, proposal_clause_snapshot_items, billing_plans,
  billing_plan_schedule_items, proposal_events, invoice_events
- Enhanced fields on clients (CRM, Notion, social media)
- Enhanced fields on projects (type, priority, billing, milestones, etc.)
- Status constraints matching the frontend's vocabulary
- RLS policies with admin/client isolation
- approve_proposal RPC

All statements are idempotent (IF NOT EXISTS / DO $$ blocks).
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUMS
-- ============================================================================
DO $$ BEGIN CREATE TYPE proposal_status AS ENUM ('draft','sent','viewed','approved','declined','expired','archived','accepted','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE service_type AS ENUM ('website','landing_page','web_app','brand_identity','seo','graphic_design','video_editing','retainer','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE clause_scope AS ENUM ('global','website','landing_page','web_app','brand_identity','seo','graphic_design','video_editing','retainer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE clause_section AS ENUM ('scope_deliverables','timeline','pricing_payment','revisions','ip_ownership','change_requests','legal_acceptance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE billing_plan_type AS ENUM ('full_upfront','split','milestones','monthly_retainer','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE schedule_trigger_type AS ENUM ('on_approval','fixed_date','relative_days_from_approval'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE schedule_status AS ENUM ('pending','created','sent','paid','void'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_provider AS ENUM ('stripe','paypal','cash','etransfer','crypto','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending','succeeded','failed','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE proposal_event_type AS ENUM ('created','updated','service_added','service_removed','pricing_changed','sent','viewed','reminder_sent','approved','declined','expired','note','signed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invoice_event_type AS ENUM ('created','updated','linked_to_proposal','activated','sent','viewed','reminder_sent','payment_recorded','paid','voided','note'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- BASE TABLES
-- ============================================================================

-- Clients (with all enhanced fields from later migrations)
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  company text,
  address text,
  website text,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- CRM fields
  service_type text,
  client_tier text,
  source text,
  -- Notion CRM fields
  first_name text,
  category text,
  location text,
  services_requested text[] DEFAULT '{}',
  -- Social media
  linkedin text,
  twitter text,
  instagram text,
  facebook text,
  youtube text,
  tiktok text
);

-- Add status constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive', 'prospect', 'vip', 'archived'));

-- Projects (with all enhanced fields)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'not_started',
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  budget numeric(10,2),
  start_date date,
  due_date date,
  team_size integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Enhanced fields
  project_type text DEFAULT 'Website',
  priority text DEFAULT 'Medium',
  billing_type text DEFAULT 'Fixed',
  invoice_link text,
  owner text,
  assigned_members text[] DEFAULT '{}',
  deliverables text[] DEFAULT '{}',
  internal_tags text[] DEFAULT '{}',
  milestones jsonb DEFAULT '[]'::jsonb,
  asset_count integer DEFAULT 0
);

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('not_started', 'in_progress', 'in_review', 'completed', 'active', 'on_hold', 'planning'));

-- Invoices (text PK to support Stripe invoice IDs)
CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  proposal_id uuid,
  amount numeric(10,2) NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'draft',
  due_date date,
  due_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  activation_source text,
  locked_from_send boolean DEFAULT true,
  -- Stripe sync fields
  stripe_invoice_id text,
  amount_paid numeric(10,2) DEFAULT 0,
  paid_at timestamptz,
  hosted_invoice_url text,
  invoice_pdf text,
  currency text DEFAULT 'usd'
);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'ready', 'pending', 'unpaid', 'paid', 'void', 'overdue', 'stale'));

-- Proposals (uuid PK)
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  status proposal_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'CAD',
  value int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  expiry_date date,
  sent_at timestamptz,
  approved_at timestamptz,
  declined_at timestamptz,
  services text[] DEFAULT '{}',
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Proposal items
CREATE TABLE IF NOT EXISTS proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  name text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price_cents int NOT NULL DEFAULT 0,
  line_total_cents int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  proposal_item_id uuid REFERENCES proposal_items(id) ON DELETE SET NULL,
  service_type service_type,
  name text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price_cents int NOT NULL DEFAULT 0,
  line_total_cents int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  provider payment_provider NOT NULL DEFAULT 'other',
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  status payment_status NOT NULL DEFAULT 'pending',
  provider_reference text,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Clause library
CREATE TABLE IF NOT EXISTS clauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  scope clause_scope NOT NULL,
  section clause_section NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Service clause mapping
CREATE TABLE IF NOT EXISTS service_clause_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type service_type NOT NULL,
  clause_id uuid NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
  required boolean NOT NULL DEFAULT true,
  sort_override int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_type, clause_id)
);

-- Proposal clause snapshots
CREATE TABLE IF NOT EXISTS proposal_clause_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  snapshot_hash text NOT NULL,
  status text NOT NULL DEFAULT 'locked',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, version)
);

CREATE TABLE IF NOT EXISTS proposal_clause_snapshot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES proposal_clause_snapshots(id) ON DELETE CASCADE,
  clause_code text NOT NULL,
  section clause_section NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Billing plans
CREATE TABLE IF NOT EXISTS billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE CASCADE,
  plan_type billing_plan_type NOT NULL DEFAULT 'full_upfront',
  currency text NOT NULL DEFAULT 'CAD',
  total_cents int NOT NULL DEFAULT 0,
  deposit_cents int NOT NULL DEFAULT 0,
  payment_terms_days int NOT NULL DEFAULT 7,
  start_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_plan_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_plan_id uuid NOT NULL REFERENCES billing_plans(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  label text NOT NULL,
  amount_cents int NOT NULL,
  due_at timestamptz,
  trigger_type schedule_trigger_type NOT NULL DEFAULT 'on_approval',
  trigger_value int,
  invoice_id text REFERENCES invoices(id) ON DELETE SET NULL,
  status schedule_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Proposal events
CREATE TABLE IF NOT EXISTS proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  type proposal_event_type NOT NULL,
  meta jsonb,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Invoice events
CREATE TABLE IF NOT EXISTS invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  type invoice_event_type NOT NULL,
  meta jsonb,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  duration text DEFAULT '30 minutes',
  type text DEFAULT 'video' CHECK (type IN ('video', 'phone', 'in-person')),
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id text PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_proposal ON invoices(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status_created ON proposals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_expires ON proposals(expires_at);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_proposal_item ON invoice_items(proposal_item_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client_id ON support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner);
CREATE INDEX IF NOT EXISTS idx_projects_internal_tags ON projects USING GIN(internal_tags);
CREATE INDEX IF NOT EXISTS idx_projects_deliverables ON projects USING GIN(deliverables);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal ON proposal_events(proposal_id);
CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice ON invoice_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_clauses_scope_active ON clauses(scope, is_active);
CREATE INDEX IF NOT EXISTS idx_clauses_section_sort ON clauses(section, sort_order);
CREATE INDEX IF NOT EXISTS idx_service_clause_map_service ON service_clause_map(service_type);
CREATE INDEX IF NOT EXISTS idx_clause_snapshots_proposal ON proposal_clause_snapshots(proposal_id);
CREATE INDEX IF NOT EXISTS idx_bpsi_plan ON billing_plan_schedule_items(billing_plan_id);
CREATE INDEX IF NOT EXISTS idx_bpsi_status ON billing_plan_schedule_items(status);
CREATE INDEX IF NOT EXISTS idx_bpsi_invoice ON billing_plan_schedule_items(invoice_id);

-- Unique index: one invoice per proposal
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_one_per_proposal ON invoices(proposal_id) WHERE proposal_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON proposals;
CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_clauses_updated_at ON clauses;
CREATE TRIGGER trg_clauses_updated_at BEFORE UPDATE ON clauses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_billing_plans_updated_at ON billing_plans;
CREATE TRIGGER trg_billing_plans_updated_at BEFORE UPDATE ON billing_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Line total calculation trigger
CREATE OR REPLACE FUNCTION calc_line_total() RETURNS trigger AS $$
BEGIN
  NEW.line_total_cents = (NEW.unit_price_cents * NEW.quantity)::int;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposal_items_line_total ON proposal_items;
CREATE TRIGGER trg_proposal_items_line_total BEFORE INSERT OR UPDATE ON proposal_items FOR EACH ROW EXECUTE FUNCTION calc_line_total();

DROP TRIGGER IF EXISTS trg_invoice_items_line_total ON invoice_items;
CREATE TRIGGER trg_invoice_items_line_total BEFORE INSERT OR UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION calc_line_total();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_clause_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_clause_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_clause_snapshot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plan_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_events ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt()->>'email' = 'icodywise@gmail.com' OR
          (auth.jwt()->'user_metadata'->>'role') = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS uuid AS $$
DECLARE
  user_email text;
  client_uuid uuid;
BEGIN
  user_email := auth.jwt()->>'email';
  SELECT id INTO client_uuid FROM clients WHERE email = user_email;
  RETURN client_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Users can read all clients" ON clients;
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;
DROP POLICY IF EXISTS "Users can read all projects" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects" ON projects;
DROP POLICY IF EXISTS "Users can read all invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;
DROP POLICY IF EXISTS "Users can read all proposals" ON proposals;
DROP POLICY IF EXISTS "Users can insert proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete proposals" ON proposals;
DROP POLICY IF EXISTS "Users can read all appointments" ON appointments;
DROP POLICY IF EXISTS "Users can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete appointments" ON appointments;
DROP POLICY IF EXISTS "Users can read all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can insert support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can delete support tickets" ON support_tickets;

-- CLIENTS policies
DROP POLICY IF EXISTS "Admin can read all clients" ON clients;
DROP POLICY IF EXISTS "Clients can read own profile" ON clients;
DROP POLICY IF EXISTS "Admin can insert clients" ON clients;
DROP POLICY IF EXISTS "Admin can update clients" ON clients;
DROP POLICY IF EXISTS "Admin can delete clients" ON clients;
CREATE POLICY "Admin can read all clients" ON clients FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Clients can read own profile" ON clients FOR SELECT TO authenticated USING (email = auth.jwt()->>'email');
CREATE POLICY "Admin can insert clients" ON clients FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin can update clients" ON clients FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can delete clients" ON clients FOR DELETE TO authenticated USING (is_admin());

-- PROJECTS policies
DROP POLICY IF EXISTS "Admin can read all projects" ON projects;
DROP POLICY IF EXISTS "Clients can read own projects" ON projects;
DROP POLICY IF EXISTS "Admin can insert projects" ON projects;
DROP POLICY IF EXISTS "Admin can update projects" ON projects;
DROP POLICY IF EXISTS "Admin can delete projects" ON projects;
CREATE POLICY "Admin can read all projects" ON projects FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Clients can read own projects" ON projects FOR SELECT TO authenticated USING (client_id = get_user_client_id());
CREATE POLICY "Admin can insert projects" ON projects FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin can update projects" ON projects FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can delete projects" ON projects FOR DELETE TO authenticated USING (is_admin());

-- INVOICES policies
DROP POLICY IF EXISTS "Admin can read all invoices" ON invoices;
DROP POLICY IF EXISTS "Clients can read own invoices" ON invoices;
DROP POLICY IF EXISTS "Admin can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Admin can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admin can delete invoices" ON invoices;
CREATE POLICY "Admin can read all invoices" ON invoices FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Clients can read own invoices" ON invoices FOR SELECT TO authenticated USING (client_id = get_user_client_id());
CREATE POLICY "Admin can insert invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin can update invoices" ON invoices FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can delete invoices" ON invoices FOR DELETE TO authenticated USING (is_admin());

-- PROPOSALS policies
DROP POLICY IF EXISTS "Admin can read all proposals" ON proposals;
DROP POLICY IF EXISTS "Clients can read own proposals" ON proposals;
DROP POLICY IF EXISTS "Admin can insert proposals" ON proposals;
DROP POLICY IF EXISTS "Admin can update proposals" ON proposals;
DROP POLICY IF EXISTS "Admin can delete proposals" ON proposals;
CREATE POLICY "Admin can read all proposals" ON proposals FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Clients can read own proposals" ON proposals FOR SELECT TO authenticated USING (client_id = get_user_client_id());
CREATE POLICY "Admin can insert proposals" ON proposals FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin can update proposals" ON proposals FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can delete proposals" ON proposals FOR DELETE TO authenticated USING (is_admin());

-- PROPOSAL_ITEMS (cascade from proposals)
DROP POLICY IF EXISTS "Admin manage proposal_items" ON proposal_items;
CREATE POLICY "Admin manage proposal_items" ON proposal_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- INVOICE_ITEMS (cascade from invoices)
DROP POLICY IF EXISTS "Admin manage invoice_items" ON invoice_items;
CREATE POLICY "Admin manage invoice_items" ON invoice_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- PAYMENTS (cascade from invoices)
DROP POLICY IF EXISTS "Admin manage payments" ON payments;
CREATE POLICY "Admin manage payments" ON payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- APPOINTMENTS policies
DROP POLICY IF EXISTS "Admin can read all appointments" ON appointments;
DROP POLICY IF EXISTS "Clients can read own appointments" ON appointments;
DROP POLICY IF EXISTS "Admin can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Admin can update appointments" ON appointments;
DROP POLICY IF EXISTS "Admin can delete appointments" ON appointments;
CREATE POLICY "Admin can read all appointments" ON appointments FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Clients can read own appointments" ON appointments FOR SELECT TO authenticated USING (client_id = get_user_client_id());
CREATE POLICY "Admin can insert appointments" ON appointments FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin can update appointments" ON appointments FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can delete appointments" ON appointments FOR DELETE TO authenticated USING (is_admin());

-- SUPPORT TICKETS policies
DROP POLICY IF EXISTS "Admin can read all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Clients can read own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Clients can create own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin can insert support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin can update support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin can delete support tickets" ON support_tickets;
CREATE POLICY "Admin can read all support tickets" ON support_tickets FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Clients can read own tickets" ON support_tickets FOR SELECT TO authenticated USING (client_id = get_user_client_id());
CREATE POLICY "Clients can create own tickets" ON support_tickets FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());
CREATE POLICY "Admin can insert support tickets" ON support_tickets FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin can update support tickets" ON support_tickets FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can delete support tickets" ON support_tickets FOR DELETE TO authenticated USING (is_admin());

-- Clause library & billing (admin-only)
DROP POLICY IF EXISTS "Admin manage clauses" ON clauses;
CREATE POLICY "Admin manage clauses" ON clauses FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin manage service_clause_map" ON service_clause_map;
CREATE POLICY "Admin manage service_clause_map" ON service_clause_map FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin manage proposal_clause_snapshots" ON proposal_clause_snapshots;
CREATE POLICY "Admin manage proposal_clause_snapshots" ON proposal_clause_snapshots FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin manage proposal_clause_snapshot_items" ON proposal_clause_snapshot_items;
CREATE POLICY "Admin manage proposal_clause_snapshot_items" ON proposal_clause_snapshot_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin manage billing_plans" ON billing_plans;
CREATE POLICY "Admin manage billing_plans" ON billing_plans FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin manage billing_plan_schedule_items" ON billing_plan_schedule_items;
CREATE POLICY "Admin manage billing_plan_schedule_items" ON billing_plan_schedule_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin manage proposal_events" ON proposal_events;
CREATE POLICY "Admin manage proposal_events" ON proposal_events FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin manage invoice_events" ON invoice_events;
CREATE POLICY "Admin manage invoice_events" ON invoice_events FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- APPROVE PROPOSAL RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_proposal(p_proposal_id uuid, p_signature text)
RETURNS void AS $$
DECLARE
  v_client_id uuid;
  v_total_cents int;
BEGIN
  v_client_id := public.get_user_client_id();
  IF NOT (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.proposals WHERE id = p_proposal_id AND client_id = v_client_id)
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to approve this proposal';
  END IF;

  SELECT COALESCE(SUM(line_total_cents), 0) INTO v_total_cents
  FROM public.proposal_items
  WHERE proposal_id = p_proposal_id;

  UPDATE public.proposals
  SET status = 'approved', approved_at = NOW(), value = v_total_cents
  WHERE id = p_proposal_id;

  UPDATE public.invoices
  SET status = 'ready', locked_from_send = false, amount = v_total_cents / 100.0
  WHERE proposal_id = p_proposal_id;

  INSERT INTO public.proposal_events (proposal_id, type, meta, created_by_user_id)
  VALUES (p_proposal_id, 'signed', jsonb_build_object('signature', p_signature), auth.uid());

  INSERT INTO public.proposal_events (proposal_id, type, created_by_user_id)
  VALUES (p_proposal_id, 'approved', auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.approve_proposal(uuid, text) TO authenticated;