ALTER TABLE clients ADD COLUMN IF NOT EXISTS youtube text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tiktok text;

UPDATE clients SET status = 'inactive' WHERE status = 'past';

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive', 'prospect', 'vip', 'archived'));
