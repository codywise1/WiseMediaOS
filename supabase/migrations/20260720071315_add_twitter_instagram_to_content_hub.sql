/*
# Add Twitter/X and Instagram sources to Content Hub

## Purpose
The content hub currently only supports blog, linkedin, youtube, and facebook sources.
The user posts 3 blogs, 5 tweets (X/Twitter), and 1 Instagram post daily, but those
sources are blocked by a CHECK constraint on the `source` column.

## Changes
1. Drop the existing CHECK constraint on `content_hub_items.source`.
2. Add a new CHECK constraint allowing: blog, linkedin, youtube, facebook, twitter, instagram.
3. No data is lost — existing rows remain valid under the new constraint.

## Security
- No RLS policy changes. Existing admin-only write policies still apply.
*/

ALTER TABLE content_hub_items DROP CONSTRAINT IF EXISTS content_hub_items_source_check;

ALTER TABLE content_hub_items ADD CONSTRAINT content_hub_items_source_check
  CHECK (source IN ('blog','linkedin','youtube','facebook','twitter','instagram'));
