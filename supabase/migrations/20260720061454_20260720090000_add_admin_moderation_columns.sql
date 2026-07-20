-- Add moderation columns to community_posts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add management columns to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add management columns to marketplace_products
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add moderation columns to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Add management columns to chat_channels
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Add admin RLS policies for marketplace_products (admin can manage all)
CREATE POLICY "admin_all_marketplace_products" ON marketplace_products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Add admin RLS policies for chat_messages (admin can delete/update any)
CREATE POLICY "admin_update_chat_messages" ON chat_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "admin_delete_chat_messages" ON chat_messages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Add admin RLS policies for chat_channels (admin can manage all)
CREATE POLICY "admin_all_chat_channels" ON chat_channels
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Add admin RLS policy for courses (admin can manage all - update existing)
CREATE POLICY "admin_update_courses" ON courses
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "admin_delete_courses" ON courses
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "admin_insert_courses" ON courses
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
