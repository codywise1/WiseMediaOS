/*
  Creator Club Core: subscription_type + community posts/comments/reactions tables

  1) Add subscription_type to profiles (free|pro), default free.
  2) Community tables:
     - community_posts
     - community_comments
     - community_reactions
  3) RLS:
     - Authenticated can read all posts/comments/reactions
     - Users can insert/update/delete own records
     - Admins (role = 'admin') can manage all
*/

-- 1) Add subscription_type to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_type text DEFAULT 'free';
  END IF;
END $$;

-- 2) Community posts
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text,
  body text NOT NULL,
  tags text[] DEFAULT '{}',
  visibility text DEFAULT 'all', -- all | pro
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- In case the table existed without visibility/attachments (reruns), ensure columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_posts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_posts' AND column_name = 'visibility') THEN
      ALTER TABLE community_posts ADD COLUMN visibility text DEFAULT 'all';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_posts' AND column_name = 'attachments') THEN
      ALTER TABLE community_posts ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  body text NOT NULL,
  parent_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction text DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, reaction)
);

-- 3) Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;

-- 3a) Posts policies
CREATE POLICY "Posts select all" ON community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Posts insert own" ON community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Posts update own" ON community_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Posts delete own" ON community_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3b) Comments policies
CREATE POLICY "Comments select all" ON community_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comments insert own" ON community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Comments update own" ON community_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Comments delete own" ON community_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3c) Reactions policies
CREATE POLICY "Reactions select all" ON community_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reactions insert own" ON community_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reactions delete own" ON community_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3d) Admin override (role stored in profiles.role)
CREATE POLICY "Admin manage posts" ON community_posts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Admin manage comments" ON community_comments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Admin manage reactions" ON community_reactions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_visibility ON community_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_post ON community_reactions(post_id);
