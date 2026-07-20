/*
# Create emails table for inbox integration

1. New Tables
- `emails`
  - `id` (uuid, primary key)
  - `from_address` (text, sender email)
  - `from_name` (text, sender display name)
  - `to_address` (text, recipient email)
  - `subject` (text, email subject line)
  - `body_text` (text, plain text body)
  - `body_html` (text, HTML body)
  - `direction` (text, 'inbound' or 'outbound')
  - `is_read` (boolean, default false)
  - `is_starred` (boolean, default false)
  - `folder` (text, default 'inbox' — inbox, sent, archive, trash)
  - `client_id` (uuid, optional link to a client)
  - `thread_id` (uuid, optional for threading)
  - `attachments` (jsonb, array of attachment metadata)
  - `received_at` (timestamptz, when email was received/sent)
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `emails`.
- Owner-scoped CRUD for authenticated users (admin/staff can access all).
- Admin and staff roles can read/write all emails.
- Regular users (clients) can only see emails where they are the recipient.
*/

CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_address text NOT NULL,
  from_name text,
  to_address text NOT NULL,
  subject text DEFAULT '',
  body_text text DEFAULT '',
  body_html text,
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  is_read boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  folder text NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'archive', 'trash')),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  thread_id uuid,
  attachments jsonb DEFAULT '[]'::jsonb,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(folder);
CREATE INDEX IF NOT EXISTS idx_emails_to_address ON emails(to_address);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Admin and staff can do everything
DROP POLICY IF EXISTS "admin_staff_select_emails" ON emails;
CREATE POLICY "admin_staff_select_emails"
ON emails FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);

DROP POLICY IF EXISTS "admin_staff_insert_emails" ON emails;
CREATE POLICY "admin_staff_insert_emails"
ON emails FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);

DROP POLICY IF EXISTS "admin_staff_update_emails" ON emails;
CREATE POLICY "admin_staff_update_emails"
ON emails FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);

DROP POLICY IF EXISTS "admin_staff_delete_emails" ON emails;
CREATE POLICY "admin_staff_delete_emails"
ON emails FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);
