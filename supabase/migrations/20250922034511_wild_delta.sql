/*
  # Fix RLS policies for clients table

  1. Security Updates
    - Drop existing restrictive policies on clients table
    - Add new policies that allow authenticated users to perform all operations
    - Ensure admin users have full access to client management
    - Allow users to insert, select, update, and delete client records

  2. Policy Details
    - INSERT: Allow authenticated users to create clients
    - SELECT: Allow authenticated users to read all clients
    - UPDATE: Allow authenticated users to update clients
    - DELETE: Allow authenticated users to delete clients

  This ensures the client management functionality works properly for authenticated users.
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can read all clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;

-- Create new policies that allow authenticated users full access
CREATE POLICY "Allow authenticated users to insert clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (true);

-- Ensure RLS is enabled on the clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;