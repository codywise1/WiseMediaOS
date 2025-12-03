/*
  # Fix RLS Policies for Proper Client Data Isolation

  ## Overview
  This migration implements proper Row Level Security to ensure:
  - Admin users (icodywise@gmail.com) can see and manage ALL data
  - Client users can ONLY see data assigned to them based on their email
  - Data isolation is enforced at the database level

  ## Changes Made

  1. **Drop Old Policies**
     - Remove all existing permissive policies that allowed all authenticated users to access all data

  2. **Create New Restrictive Policies**
     - Admin: Full access to all tables
     - Clients: Only access to their own data (matched by email to client_id)

  3. **Security Features**
     - Client isolation enforced at database level
     - Admin identified by email (icodywise@gmail.com)
     - Proper role-based access control

  ## Policy Structure
  - SELECT: Admins see all, clients see only their records
  - INSERT: Admins can create for any client, clients cannot create records
  - UPDATE: Admins can update all, clients cannot update
  - DELETE: Admins can delete all, clients cannot delete
*/

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt()->>'email' = 'icodywise@gmail.com' OR 
          (auth.jwt()->'user_metadata'->>'role') = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get client_id for current user
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS uuid AS $$
DECLARE
  user_email text;
  client_uuid uuid;
BEGIN
  user_email := auth.jwt()->>'email';
  
  SELECT id INTO client_uuid
  FROM clients
  WHERE email = user_email;
  
  RETURN client_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing policies
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

-- CLIENTS TABLE POLICIES
CREATE POLICY "Admin can read all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Clients can read own profile"
  ON clients FOR SELECT
  TO authenticated
  USING (email = auth.jwt()->>'email');

CREATE POLICY "Admin can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (is_admin());

-- PROJECTS TABLE POLICIES
CREATE POLICY "Admin can read all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Clients can read own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (client_id = get_user_client_id());

CREATE POLICY "Admin can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (is_admin());

-- INVOICES TABLE POLICIES
CREATE POLICY "Admin can read all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Clients can read own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (client_id = get_user_client_id());

CREATE POLICY "Admin can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (is_admin());

-- PROPOSALS TABLE POLICIES
CREATE POLICY "Admin can read all proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Clients can read own proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (client_id = get_user_client_id());

CREATE POLICY "Admin can insert proposals"
  ON proposals FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update proposals"
  ON proposals FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete proposals"
  ON proposals FOR DELETE
  TO authenticated
  USING (is_admin());

-- APPOINTMENTS TABLE POLICIES
CREATE POLICY "Admin can read all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Clients can read own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (client_id = get_user_client_id());

CREATE POLICY "Admin can insert appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (is_admin());

-- SUPPORT TICKETS TABLE POLICIES
CREATE POLICY "Admin can read all support tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Clients can read own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (client_id = get_user_client_id());

CREATE POLICY "Clients can create own tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (client_id = get_user_client_id());

CREATE POLICY "Admin can insert support tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update support tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete support tickets"
  ON support_tickets FOR DELETE
  TO authenticated
  USING (is_admin());