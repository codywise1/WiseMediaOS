-- Drop the existing constraint if it exists
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add the new unified status check constraint
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
CHECK (status IN ('not_started', 'in_progress', 'in_review', 'completed', 'active', 'on_hold', 'planning'));

-- (Optional) Update any existing legacy status values to the new standard if desired
-- UPDATE projects SET status = 'not_started' WHERE status = 'active'; -- Example of migration
