/*
# Content Hub — Unified Brand Content Aggregator

## Purpose
Creates a unified content hub that aggregates blog articles, LinkedIn posts, YouTube videos, and Facebook updates into one native community feed. External content is stored as rows and rendered as native community cards (no iframes/embeds in the feed).

## New Tables

### 1. `content_hub_items`
Stores all aggregated content from external sources.
- `id` uuid PK
- `source` text — which channel: 'blog' | 'linkedin' | 'youtube' | 'facebook'
- `external_id` text — unique ID from the source platform (e.g. YouTube video ID)
- `title` text — content title
- `description` text — short excerpt / post text / video description
- `body` text — full article body (for blog posts, markdown)
- `author_name` text — author / poster name
- `author_avatar` text — profile image URL
- `cover_image_url` text — featured image / thumbnail
- `category` text — category / playlist name
- `tags` text[] — tags / hashtags
- `media_urls` jsonb — array of {type, url} for images/videos/carousels
- `external_url` text — link back to original post
- `published_at` timestamptz — original publish date
- `duration` text — video duration (ISO 8601 or human-readable)
- `view_count` integer — views / impressions
- `like_count` integer — likes from source platform
- `comment_count` integer — comments from source platform
- `is_featured` boolean — admin-curated featured flag
- `is_hidden` boolean — admin hidden flag
- `synced_at` timestamptz — last sync timestamp
- `created_at` timestamptz

Unique constraint on (source, external_id) to prevent duplicate syncs.

### 2. `content_hub_reactions`
User reactions (emoji) on hub items.
- `id` uuid PK
- `item_id` uuid FK → content_hub_items
- `user_id` uuid FK → profiles
- `reaction` text — emoji character
- `created_at` timestamptz
Unique on (item_id, user_id) — one reaction per user per item.

### 3. `content_hub_comments`
Discussion threads attached to hub items.
- `id` uuid PK
- `item_id` uuid FK → content_hub_items
- `user_id` uuid FK → profiles
- `body` text
- `parent_id` uuid FK → content_hub_comments (nullable, for threaded replies)
- `created_at` timestamptz

### 4. `content_hub_bookmarks`
Save/bookmark tracking.
- `id` uuid PK
- `item_id` uuid FK → content_hub_items
- `user_id` uuid FK → profiles
- `created_at` timestamptz
Unique on (item_id, user_id).

## Security
- RLS enabled on all tables.
- content_hub_items: readable by anon + authenticated (public brand content).
- Writes (insert/update/delete) restricted to authenticated users; only admin can create/update/delete items.
- Reactions, comments, bookmarks: authenticated users can CRUD their own rows; all can read.
*/

-- ============================================================
-- content_hub_items
-- ============================================================
CREATE TABLE IF NOT EXISTS content_hub_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('blog','linkedin','youtube','facebook')),
  external_id text NOT NULL,
  title text NOT NULL,
  description text,
  body text,
  author_name text,
  author_avatar text,
  cover_image_url text,
  category text,
  tags text[] DEFAULT '{}',
  media_urls jsonb DEFAULT '[]'::jsonb,
  external_url text,
  published_at timestamptz,
  duration text,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS content_hub_items_source_external_idx
  ON content_hub_items (source, external_id);

CREATE INDEX IF NOT EXISTS content_hub_items_published_idx
  ON content_hub_items (published_at DESC);

CREATE INDEX IF NOT EXISTS content_hub_items_source_idx
  ON content_hub_items (source);

ALTER TABLE content_hub_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_items_read_all" ON content_hub_items;
CREATE POLICY "hub_items_read_all" ON content_hub_items
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "hub_items_insert_admin" ON content_hub_items;
CREATE POLICY "hub_items_insert_admin" ON content_hub_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "hub_items_update_admin" ON content_hub_items;
CREATE POLICY "hub_items_update_admin" ON content_hub_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "hub_items_delete_admin" ON content_hub_items;
CREATE POLICY "hub_items_delete_admin" ON content_hub_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- content_hub_reactions
-- ============================================================
CREATE TABLE IF NOT EXISTS content_hub_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES content_hub_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS content_hub_reactions_item_user_idx
  ON content_hub_reactions (item_id, user_id);

CREATE INDEX IF NOT EXISTS content_hub_reactions_item_idx
  ON content_hub_reactions (item_id);

ALTER TABLE content_hub_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_reactions_read_all" ON content_hub_reactions;
CREATE POLICY "hub_reactions_read_all" ON content_hub_reactions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "hub_reactions_insert_own" ON content_hub_reactions;
CREATE POLICY "hub_reactions_insert_own" ON content_hub_reactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "hub_reactions_update_own" ON content_hub_reactions;
CREATE POLICY "hub_reactions_update_own" ON content_hub_reactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "hub_reactions_delete_own" ON content_hub_reactions;
CREATE POLICY "hub_reactions_delete_own" ON content_hub_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- content_hub_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS content_hub_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES content_hub_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  parent_id uuid REFERENCES content_hub_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_hub_comments_item_idx
  ON content_hub_comments (item_id);

ALTER TABLE content_hub_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_comments_read_all" ON content_hub_comments;
CREATE POLICY "hub_comments_read_all" ON content_hub_comments
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "hub_comments_insert_own" ON content_hub_comments;
CREATE POLICY "hub_comments_insert_own" ON content_hub_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "hub_comments_update_own" ON content_hub_comments;
CREATE POLICY "hub_comments_update_own" ON content_hub_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "hub_comments_delete_own" ON content_hub_comments;
CREATE POLICY "hub_comments_delete_own" ON content_hub_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- content_hub_bookmarks
-- ============================================================
CREATE TABLE IF NOT EXISTS content_hub_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES content_hub_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS content_hub_bookmarks_item_user_idx
  ON content_hub_bookmarks (item_id, user_id);

ALTER TABLE content_hub_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_bookmarks_read_own" ON content_hub_bookmarks;
CREATE POLICY "hub_bookmarks_read_own" ON content_hub_bookmarks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "hub_bookmarks_insert_own" ON content_hub_bookmarks;
CREATE POLICY "hub_bookmarks_insert_own" ON content_hub_bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "hub_bookmarks_delete_own" ON content_hub_bookmarks;
CREATE POLICY "hub_bookmarks_delete_own" ON content_hub_bookmarks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
