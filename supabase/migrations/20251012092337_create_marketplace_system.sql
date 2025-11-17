/*
  # Create Marketplace System

  1. New Tables
    - `marketplace_products` - Product listings
    - `product_purchases` - Purchase records
    - `product_reviews` - Customer reviews

  2. Security
    - Enable RLS on all tables
    - Proper access policies
*/

CREATE TABLE IF NOT EXISTS marketplace_products (
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
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  is_featured boolean DEFAULT false,
  discount_enabled boolean DEFAULT false,
  affiliate_link text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
  ON marketplace_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Creators can manage their products"
  ON marketplace_products FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS product_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES marketplace_products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount_paid numeric NOT NULL,
  purchased_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE product_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON product_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create purchases"
  ON product_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES marketplace_products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  is_verified_buyer boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON product_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for purchased products"
  ON product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM product_purchases
      WHERE product_purchases.product_id = product_reviews.product_id
      AND product_purchases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own reviews"
  ON product_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_products_category ON marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_products_creator ON marketplace_products(creator_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON product_purchases(user_id);
