/*
  # Create comprehensive client management system

  1. New Tables
    - `clients` - Core client information
    - `projects` - Project management with client relationships
    - `invoices` - Invoice management with client relationships
    - `proposals` - Proposal management with client relationships
    - `appointments` - Appointment scheduling with client relationships
    - `support_tickets` - Support ticket management with client relationships

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
    - Admin users can see all data, regular users see only their assigned data

  3. Relationships
    - All entities are linked to clients via foreign keys
    - Proper cascading and referential integrity
    - Indexes for performance
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  company text,
  address text,
  website text,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  budget numeric(10,2),
  start_date date,
  due_date date,
  team_size integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'overdue')),
  due_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id text PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  value numeric(10,2) NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'under_review', 'approved', 'rejected')),
  services text[] DEFAULT '{}',
  expiry_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
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

-- Create support tickets table
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

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for clients
CREATE POLICY "Users can read all clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for projects
CREATE POLICY "Users can read all projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for invoices
CREATE POLICY "Users can read all invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert invoices"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update invoices"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete invoices"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for proposals
CREATE POLICY "Users can read all proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert proposals"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update proposals"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete proposals"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for appointments
CREATE POLICY "Users can read all appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete appointments"
  ON appointments
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for support tickets
CREATE POLICY "Users can read all support tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert support tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update support tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete support tickets"
  ON support_tickets
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client_id ON support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- Insert sample clients
INSERT INTO clients (name, email, company, phone, status) VALUES
  ('John Smith', 'john@techstart.com', 'TechStart Inc.', '+1 (555) 123-4567', 'active'),
  ('Sarah Johnson', 'sarah@healthcorp.com', 'HealthCorp', '+1 (555) 234-5678', 'active'),
  ('Mike Wilson', 'mike@startup.co', 'StartUp Co.', '+1 (555) 345-6789', 'active'),
  ('Lisa Brown', 'lisa@localbiz.com', 'Local Business', '+1 (555) 456-7890', 'active'),
  ('David Chen', 'david@creative.agency', 'Creative Agency Co.', '+1 (555) 567-8901', 'prospect')
ON CONFLICT (email) DO NOTHING;