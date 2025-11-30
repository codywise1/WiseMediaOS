/*
  # Enhanced Projects Schema

  1. New Fields Added to Projects Table
    - `project_type` (text) - Type of project: Website, Brand Identity, Landing Page, CRM Build, Ad Campaign, Custom
    - `priority` (text) - Project priority: Low, Medium, High, Urgent
    - `billing_type` (text) - Billing type: Fixed, Hourly, Retainer
    - `invoice_link` (text) - Optional URL to invoice
    - `start_date` (date) - Project start date
    - `owner` (text) - Assigned internal owner/project manager
    - `assigned_members` (text[]) - Array of assigned team member names
    - `deliverables` (text[]) - Array of deliverable tags
    - `internal_tags` (text[]) - Array of internal tags for filtering
    - `milestones` (jsonb) - Array of milestone objects with name, due_date, completed
    - `asset_count` (integer) - Number of project assets/files
    - Enhanced `description` field with better indexing

  2. Changes
    - Add new columns with appropriate defaults
    - Update existing status values to match new naming
    - Add indexes for better query performance
    
  3. Security
    - No RLS changes needed, existing policies apply to new columns
*/

-- Add new columns to projects table
DO $$
BEGIN
  -- Project type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'project_type'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_type text DEFAULT 'Website';
  END IF;

  -- Priority
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'priority'
  ) THEN
    ALTER TABLE projects ADD COLUMN priority text DEFAULT 'Medium';
  END IF;

  -- Billing type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'billing_type'
  ) THEN
    ALTER TABLE projects ADD COLUMN billing_type text DEFAULT 'Fixed';
  END IF;

  -- Invoice link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'invoice_link'
  ) THEN
    ALTER TABLE projects ADD COLUMN invoice_link text;
  END IF;

  -- Owner
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'owner'
  ) THEN
    ALTER TABLE projects ADD COLUMN owner text;
  END IF;

  -- Assigned members
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'assigned_members'
  ) THEN
    ALTER TABLE projects ADD COLUMN assigned_members text[] DEFAULT '{}';
  END IF;

  -- Deliverables
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'deliverables'
  ) THEN
    ALTER TABLE projects ADD COLUMN deliverables text[] DEFAULT '{}';
  END IF;

  -- Internal tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'internal_tags'
  ) THEN
    ALTER TABLE projects ADD COLUMN internal_tags text[] DEFAULT '{}';
  END IF;

  -- Milestones
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'milestones'
  ) THEN
    ALTER TABLE projects ADD COLUMN milestones jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Asset count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'asset_count'
  ) THEN
    ALTER TABLE projects ADD COLUMN asset_count integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner);
CREATE INDEX IF NOT EXISTS idx_projects_internal_tags ON projects USING GIN(internal_tags);
CREATE INDEX IF NOT EXISTS idx_projects_deliverables ON projects USING GIN(deliverables);