/*
  # Create Community Chat System

  1. New Tables
    - chat_channels - Chat channels/rooms
    - channel_members - Channel membership
    - chat_messages - Messages in channels
    - private_messages - Direct messages between users

  2. Security
    - RLS enabled on all tables
    - Proper access controls
*/

CREATE TABLE IF NOT EXISTS chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text DEFAULT 'general' CHECK (type IN ('general', 'private')),
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view general channels"
  ON chat_channels FOR SELECT
  TO authenticated
  USING (type = 'general' OR created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = chat_channels.id
    AND channel_members.user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create channels"
  ON chat_channels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view channel members"
  ON channel_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join channels"
  ON channel_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their channels"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_channels
      WHERE chat_channels.id = chat_messages.channel_id
      AND (
        chat_channels.type = 'general'
        OR chat_channels.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM channel_members
          WHERE channel_members.channel_id = chat_channels.id
          AND channel_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can send messages to their channels"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM chat_channels
      WHERE chat_channels.id = chat_messages.channel_id
      AND (
        chat_channels.type = 'general'
        OR chat_channels.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM channel_members
          WHERE channel_members.channel_id = chat_channels.id
          AND channel_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can view their private messages"
  ON private_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send private messages"
  ON private_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status"
  ON private_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_recipient ON private_messages(recipient_id, created_at DESC);

DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    INSERT INTO chat_channels (name, description, type, created_by) VALUES
      ('General Chat', 'Welcome to the Creator Club community! Share ideas, ask questions, and connect with fellow creators.', 'general', admin_id),
      ('Success Stories', 'Share your wins, milestones, and achievements with the community!', 'general', admin_id),
      ('Content Feedback', 'Get feedback on your content from fellow creators. Constructive criticism welcome!', 'general', admin_id),
      ('Tech Help', 'Having technical issues? Ask for help with tools, software, and technology here.', 'general', admin_id);
  END IF;
END $$;
