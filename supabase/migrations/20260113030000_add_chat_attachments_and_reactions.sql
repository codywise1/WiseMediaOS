/*
  Add attachments and reactions to chat system

  1. New Columns
    - Add `attachments` (jsonb) to `chat_messages`
    - Add `attachments` (jsonb) to `private_messages`
  
  2. New Tables
    - `chat_reactions`: Reactions for channel messages
    - `private_message_reactions`: Reactions for private messages

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- 1. Add attachments column to chat tables if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'private_messages' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE private_messages ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 2. Create chat_reactions table
CREATE TABLE IF NOT EXISTS chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

-- 3. Create private_message_reactions table
CREATE TABLE IF NOT EXISTS private_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES private_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

-- 4. Enable RLS
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_message_reactions ENABLE ROW LEVEL SECURITY;

-- 5. Policies for chat_reactions
CREATE POLICY "Anyone can view chat reactions"
  ON chat_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own chat reactions"
  ON chat_reactions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all chat reactions"
  ON chat_reactions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Policies for private_message_reactions
CREATE POLICY "Users can view relevant private reactions"
  ON private_message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private_messages pm
      WHERE pm.id = message_id
      AND (pm.sender_id = auth.uid() OR pm.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their own private reactions"
  ON private_message_reactions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all private reactions"
  ON private_message_reactions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_private_message_reactions_message ON private_message_reactions(message_id);
