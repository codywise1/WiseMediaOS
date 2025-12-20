DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_posts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_posts' AND column_name = 'body') THEN
      ALTER TABLE public.community_posts ADD COLUMN body text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_posts' AND column_name = 'title') THEN
      ALTER TABLE public.community_posts ADD COLUMN title text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_posts' AND column_name = 'tags') THEN
      ALTER TABLE public.community_posts ADD COLUMN tags text[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_posts' AND column_name = 'visibility') THEN
      ALTER TABLE public.community_posts ADD COLUMN visibility text DEFAULT 'all';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_posts' AND column_name = 'attachments') THEN
      ALTER TABLE public.community_posts ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_posts' AND column_name = 'content') THEN
      BEGIN
        ALTER TABLE public.community_posts ALTER COLUMN content DROP NOT NULL;
      EXCEPTION WHEN others THEN
        NULL;
      END;
    ELSE
      ALTER TABLE public.community_posts ADD COLUMN content text;
    END IF;
  END IF;
END $$;

UPDATE public.community_posts
SET body = content
WHERE body IS NULL AND content IS NOT NULL;
