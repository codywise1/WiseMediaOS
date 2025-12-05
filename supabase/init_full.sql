-- WiseMediaOS Unified Database Initialization Script (idempotent)
-- This script consolidates schema, policies, functions, triggers, and indexes
-- for a fresh database setup without conflicts.

-- 0) Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Core auth-linked profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  role text NOT NULL DEFAULT 'free' CHECK (role IN ('admin', 'elite', 'pro', 'free')),
  avatar_url text,
  bio text DEFAULT '',
  website text,
  location text,
  twitter text,
  instagram text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old/duplicate profile policies to avoid recursion and conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone authenticated can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone authenticated can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone authenticated can insert own profile" ON public.profiles;

-- Minimal, safe profile policies
CREATE POLICY "Anyone authenticated can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Anyone authenticated can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone authenticated can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_updated_at();

-- 2) CRM: clients and related entities
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  first_name text,
  email text UNIQUE NOT NULL,
  phone text,
  company text,
  address text,
  website text,
  notes text,
  category text,
  location text,
  services_requested text[] DEFAULT '{}',
  service_type text CHECK (service_type IN ('Website', 'Branding', 'Retainer', 'Ads', 'Other')),
  client_tier text CHECK (client_tier IN ('Lead', 'Active', 'Past', 'VIP')),
  source text CHECK (source IN ('Referral', 'Instagram', 'X', 'Repeat', 'Other')),
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  linkedin text,
  twitter text,
  instagram text,
  facebook text,
  github text,
  CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive', 'prospect', 'archived'))
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Projects (client-based)
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  budget numeric(10,2),
  start_date date,
  due_date date,
  team_size integer DEFAULT 1,
  -- Enhanced fields
  project_type text DEFAULT 'Website',
  priority text DEFAULT 'Medium',
  billing_type text DEFAULT 'Fixed',
  invoice_link text,
  owner text,
  assigned_members text[] DEFAULT '{}',
  deliverables text[] DEFAULT '{}',
  internal_tags text[] DEFAULT '{}',
  milestones jsonb DEFAULT '[]'::jsonb,
  asset_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Invoices (client-based, uuid id to match payments FK)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  due_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Proposals (client-based)
CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'under_review', 'approved', 'rejected')),
  services text[] DEFAULT '{}',
  expiry_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Appointments (client-based)
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  duration text DEFAULT '30 minutes',
  type text DEFAULT 'video' CHECK (type IN ('video', 'phone', 'in-person')),
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Support tickets (client-based)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Notes (admin-private; references projects)
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  notebook text DEFAULT 'General',
  tags text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 3) Learning, marketplace, community (profiles ecosystem)
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  price numeric DEFAULT 0 CHECK (price >= 0),
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  enrollment_count integer DEFAULT 0 CHECK (enrollment_count >= 0),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  progress numeric DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  price numeric DEFAULT 0 CHECK (price >= 0),
  file_url text,
  thumbnail_url text,
  downloads integer DEFAULT 0 CHECK (downloads >= 0),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

-- Separate marketplace system (products, purchases, reviews)
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  old_price numeric,
  category text DEFAULT 'templates',
  rating numeric DEFAULT 0,
  reviews_count integer DEFAULT 0,
  purchases_count integer DEFAULT 0,
  cover_image_url text,
  preview_images text[],
  included_files jsonb DEFAULT '[]'::jsonb,
  tags text[],
  platform text,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_featured boolean DEFAULT false,
  discount_enabled boolean DEFAULT false,
  affiliate_link text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.product_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.marketplace_products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount_paid numeric NOT NULL,
  purchased_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);
ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.marketplace_products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  is_verified_buyer boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  likes_count integer DEFAULT 0 CHECK (likes_count >= 0),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Lessons and discussions
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  video_url text,
  duration_minutes integer DEFAULT 0,
  order_index integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  time_spent_minutes integer DEFAULT 0,
  last_watched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.course_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  resource_type text DEFAULT 'link',
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.course_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.course_discussions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.course_discussions ENABLE ROW LEVEL SECURITY;

-- Chat system
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text DEFAULT 'general' CHECK (type IN ('general', 'private')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- 4) Payments (links invoices)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_txn_id text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  payer_email text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Ensure provider constraint includes 'solana'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_provider_check CHECK (provider IN ('paypal', 'stripe', 'bank_transfer', 'solana'));

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5) Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt()->>'email' = 'icodywise@gmail.com' OR (auth.jwt()->'user_metadata'->>'role') = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS uuid AS $$
DECLARE
  user_email text;
  client_uuid uuid;
BEGIN
  user_email := auth.jwt()->>'email';
  SELECT id INTO client_uuid FROM public.clients WHERE email = user_email;
  RETURN client_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) RLS policies
-- Drop permissive legacy policies from early migrations (if any)
DROP POLICY IF EXISTS "Users can read all clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients" ON public.clients;

DROP POLICY IF EXISTS "Users can read all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects" ON public.projects;

DROP POLICY IF EXISTS "Users can read all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices" ON public.invoices;

DROP POLICY IF EXISTS "Users can read all proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can update proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can delete proposals" ON public.proposals;

DROP POLICY IF EXISTS "Users can read all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete appointments" ON public.appointments;

DROP POLICY IF EXISTS "Users can read all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can insert support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can delete support tickets" ON public.support_tickets;

-- Clients
CREATE POLICY "Admin can read all clients"
  ON public.clients FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Clients can read own profile"
  ON public.clients FOR SELECT TO authenticated
  USING (email = auth.jwt()->>'email');

CREATE POLICY "Admin can insert clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (public.is_admin());

-- Projects
CREATE POLICY "Admin can read all projects"
  ON public.projects FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Clients can read own projects"
  ON public.projects FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Admin can insert projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete projects"
  ON public.projects FOR DELETE TO authenticated
  USING (public.is_admin());

-- Invoices
CREATE POLICY "Admin can read all invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Clients can read own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Admin can insert invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (public.is_admin());

-- Proposals
CREATE POLICY "Admin can read all proposals"
  ON public.proposals FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Clients can read own proposals"
  ON public.proposals FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Admin can insert proposals"
  ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update proposals"
  ON public.proposals FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete proposals"
  ON public.proposals FOR DELETE TO authenticated
  USING (public.is_admin());

-- Appointments
CREATE POLICY "Admin can read all appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Clients can read own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Admin can insert appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.is_admin());

-- Support tickets
CREATE POLICY "Admin can read all support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Clients can read own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Clients can create own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Admin can insert support tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update support tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete support tickets"
  ON public.support_tickets FOR DELETE TO authenticated
  USING (public.is_admin());

-- Notes (admin-only)
DROP POLICY IF EXISTS "Only admins can view notes" ON public.notes;
DROP POLICY IF EXISTS "Only admins can create notes" ON public.notes;
DROP POLICY IF EXISTS "Only admins can update own notes" ON public.notes;
DROP POLICY IF EXISTS "Only admins can delete own notes" ON public.notes;

CREATE POLICY "Only admins can view notes"
  ON public.notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    ) AND auth.uid() = admin_id
  );

CREATE POLICY "Only admins can create notes"
  ON public.notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    ) AND auth.uid() = admin_id
  );

CREATE POLICY "Only admins can update own notes"
  ON public.notes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    ) AND auth.uid() = admin_id
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    ) AND auth.uid() = admin_id
  );

CREATE POLICY "Only admins can delete own notes"
  ON public.notes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    ) AND auth.uid() = admin_id
  );

-- Courses & related policies
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Users can view own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users can create own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.course_enrollments;
CREATE POLICY "Users can view own enrollments"
  ON public.course_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create own enrollments"
  ON public.course_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollments"
  ON public.course_enrollments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments"
  ON public.course_enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Marketplace (items)
DROP POLICY IF EXISTS "Anyone can view marketplace items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Elite users can create marketplace items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Creators can update own items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Admins can manage all marketplace items" ON public.marketplace_items;
CREATE POLICY "Anyone can view marketplace items"
  ON public.marketplace_items FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Elite users can create marketplace items"
  ON public.marketplace_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('elite','admin')) AND auth.uid() = creator_id);
CREATE POLICY "Creators can update own items"
  ON public.marketplace_items FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Admins can manage all marketplace items"
  ON public.marketplace_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Marketplace (products)
DROP POLICY IF EXISTS "Anyone can view products" ON public.marketplace_products;
DROP POLICY IF EXISTS "Creators can manage their products" ON public.marketplace_products;
CREATE POLICY "Anyone can view products"
  ON public.marketplace_products FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Creators can manage their products"
  ON public.marketplace_products FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can view own purchases" ON public.product_purchases;
DROP POLICY IF EXISTS "Users can create purchases" ON public.product_purchases;
CREATE POLICY "Users can view own purchases"
  ON public.product_purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create purchases"
  ON public.product_purchases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can create reviews for purchased products" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.product_reviews;
CREATE POLICY "Anyone can view reviews"
  ON public.product_reviews FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Users can create reviews for purchased products"
  ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.product_purchases pp
      WHERE pp.product_id = public.product_reviews.product_id
      AND pp.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own reviews"
  ON public.product_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Community posts
DROP POLICY IF EXISTS "Anyone can view community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can create own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.community_posts;
CREATE POLICY "Anyone can view community posts"
  ON public.community_posts FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Users can create own posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts"
  ON public.community_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts"
  ON public.community_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Lessons-related policies
DROP POLICY IF EXISTS "Anyone can view published lessons" ON public.lessons;
DROP POLICY IF EXISTS "Course creators can manage their lessons" ON public.lessons;
CREATE POLICY "Anyone can view published lessons"
  ON public.lessons FOR SELECT TO authenticated
  USING (is_published = true);
CREATE POLICY "Course creators can manage their lessons"
  ON public.lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = public.lessons.course_id AND c.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = public.lessons.course_id AND c.creator_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.lesson_progress;
CREATE POLICY "Users can view own progress"
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress"
  ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress"
  ON public.lesson_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view course resources" ON public.course_resources;
DROP POLICY IF EXISTS "Course creators can manage resources" ON public.course_resources;
CREATE POLICY "Anyone can view course resources"
  ON public.course_resources FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Course creators can manage resources"
  ON public.course_resources FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = public.course_resources.course_id AND c.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = public.course_resources.course_id AND c.creator_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view discussions" ON public.course_discussions;
DROP POLICY IF EXISTS "Authenticated users can post discussions" ON public.course_discussions;
DROP POLICY IF EXISTS "Users can update own discussions" ON public.course_discussions;
DROP POLICY IF EXISTS "Users can delete own discussions" ON public.course_discussions;
CREATE POLICY "Anyone can view discussions"
  ON public.course_discussions FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can post discussions"
  ON public.course_discussions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own discussions"
  ON public.course_discussions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own discussions"
  ON public.course_discussions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Chat policies
DROP POLICY IF EXISTS "Anyone can view general channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Authenticated users can create channels" ON public.chat_channels;
CREATE POLICY "Anyone can view general channels"
  ON public.chat_channels FOR SELECT TO authenticated
  USING (type = 'general' OR created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = public.chat_channels.id AND cm.user_id = auth.uid()
  ));
CREATE POLICY "Authenticated users can create channels"
  ON public.chat_channels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can view channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can join channels" ON public.channel_members;
CREATE POLICY "Users can view channel members"
  ON public.channel_members FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Users can join channels"
  ON public.channel_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view messages in their channels" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their channels" ON public.chat_messages;
CREATE POLICY "Users can view messages in their channels"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_channels ch
    WHERE ch.id = public.chat_messages.channel_id AND (
      ch.type = 'general' OR ch.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = ch.id AND cm.user_id = auth.uid()
      )
    )
  ));
CREATE POLICY "Users can send messages to their channels"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.chat_channels ch
    WHERE ch.id = public.chat_messages.channel_id AND (
      ch.type = 'general' OR ch.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = ch.id AND cm.user_id = auth.uid()
      )
    )
  ));

DROP POLICY IF EXISTS "Users can view their private messages" ON public.private_messages;
DROP POLICY IF EXISTS "Users can send private messages" ON public.private_messages;
DROP POLICY IF EXISTS "Users can update read status" ON public.private_messages;
CREATE POLICY "Users can view their private messages"
  ON public.private_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send private messages"
  ON public.private_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update read status"
  ON public.private_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- Payments policies
DROP POLICY IF EXISTS "Admin can read all payments" ON public.payments;
DROP POLICY IF EXISTS "Clients can read own payments" ON public.payments;
DROP POLICY IF EXISTS "Admin can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admin can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admin can delete payments" ON public.payments;
CREATE POLICY "Admin can read all payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "Clients can read own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = public.payments.invoice_id
      AND i.client_id = public.get_user_client_id()
  ));
CREATE POLICY "Admin can insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin can delete payments"
  ON public.payments FOR DELETE TO authenticated
  USING (public.is_admin());

-- 7) Signup trigger: create both profile and client on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  user_role text;
BEGIN
  -- Determine role (promote specific admin email)
  IF lower(NEW.email) IN ('info@wisemedia.io') OR coalesce(NEW.raw_user_meta_data->>'role','') = 'admin' THEN
    user_role := 'admin';
  ELSE
    user_role := 'free';
  END IF;

  -- Create profile if not exists
  INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = EXCLUDED.role,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  -- Create/Upsert client for non-admin users, keyed by email
  IF user_role <> 'admin' THEN
    INSERT INTO public.clients (id, name, email, phone, status, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      'active',
      now(),
      now()
    )
    ON CONFLICT (email) DO UPDATE
      SET name = COALESCE(EXCLUDED.name, public.clients.name),
          phone = COALESCE(EXCLUDED.phone, public.clients.phone),
          updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8) Indexes
-- CRM indexes
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client_id ON public.support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);

-- Lessons/resources/discussions indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_resources_course ON public.course_resources(course_id);
CREATE INDEX IF NOT EXISTS idx_discussions_course ON public.course_discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_discussions_lesson ON public.course_discussions(lesson_id);

-- Marketplace indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_products_creator ON public.marketplace_products(creator_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON public.product_purchases(user_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON public.private_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_recipient ON public.private_messages(recipient_id, created_at DESC);
