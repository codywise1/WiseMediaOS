/*
  # Seed Marketplace Products

  1. Sample Products
    - Creates 12 sample products across different categories
    - Includes all product details with realistic data
    - Mock reviews and purchases for testing
*/

DO $$
DECLARE
  admin_id uuid;
  product1_id uuid := gen_random_uuid();
  product2_id uuid := gen_random_uuid();
  product3_id uuid := gen_random_uuid();
  product4_id uuid := gen_random_uuid();
  product5_id uuid := gen_random_uuid();
  product6_id uuid := gen_random_uuid();
  product7_id uuid := gen_random_uuid();
  product8_id uuid := gen_random_uuid();
  product9_id uuid := gen_random_uuid();
  product10_id uuid := gen_random_uuid();
  product11_id uuid := gen_random_uuid();
  product12_id uuid := gen_random_uuid();
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found. Please create an admin user first.';
  END IF;

  INSERT INTO marketplace_products (id, title, description, price, old_price, category, rating, reviews_count, purchases_count, cover_image_url, preview_images, included_files, tags, platform, creator_id, is_featured, discount_enabled, created_at) VALUES
  (
    product1_id,
    'Ultimate Social Media Template Pack',
    'A comprehensive collection of 50+ professionally designed social media templates for Instagram, Facebook, and Twitter. Perfect for creators who want to maintain a consistent brand aesthetic across all platforms. Includes editable Canva templates with easy customization options.',
    49.99,
    79.99,
    'templates',
    4.8,
    124,
    1247,
    'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg',
    ARRAY['https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg', 'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg'],
    '[
      {"name": "50 Instagram Post Templates", "description": "Fully editable Canva templates"},
      {"name": "20 Instagram Story Templates", "description": "Vertical format optimized"},
      {"name": "15 Facebook Post Templates", "description": "Perfect sizing for FB"},
      {"name": "Brand Style Guide PDF", "description": "How to customize guide"}
    ]'::jsonb,
    ARRAY['Templates', 'Social Media', 'Instagram', 'Design'],
    'Canva',
    admin_id,
    true,
    true,
    now() - interval '2 days'
  ),
  (
    product2_id,
    'SEO Toolkit Bundle',
    'Everything you need to dominate search rankings. This comprehensive SEO toolkit includes keyword research templates, content planning spreadsheets, backlink tracking tools, and a complete technical SEO checklist. Built for serious content creators and marketers.',
    79.99,
    NULL,
    'toolkits',
    4.9,
    89,
    856,
    'https://images.pexels.com/photos/270637/pexels-photo-270637.jpeg',
    ARRAY['https://images.pexels.com/photos/270637/pexels-photo-270637.jpeg'],
    '[
      {"name": "Keyword Research Template", "description": "Excel/Google Sheets format"},
      {"name": "Content Calendar Template", "description": "Plan 3 months ahead"},
      {"name": "SEO Checklist PDF", "description": "50-point comprehensive guide"},
      {"name": "Backlink Tracker", "description": "Monitor your link building"}
    ]'::jsonb,
    ARRAY['SEO', 'Marketing', 'Tools', 'Analytics'],
    'Google Sheets',
    admin_id,
    true,
    false,
    now() - interval '5 days'
  ),
  (
    product3_id,
    'Minimalist Brand Graphics Pack',
    'Clean, modern graphics perfect for the modern creator. This pack includes logos, icons, social media headers, and business card templates. All files are provided in vector format for unlimited scaling.',
    29.99,
    NULL,
    'graphics',
    4.7,
    156,
    2103,
    'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg',
    ARRAY['https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg'],
    '[
      {"name": "50 Logo Templates", "description": "AI and PNG formats"},
      {"name": "200 Icon Set", "description": "SVG vector icons"},
      {"name": "10 Business Card Designs", "description": "Print-ready PDF"},
      {"name": "Social Media Headers", "description": "All major platforms"}
    ]'::jsonb,
    ARRAY['Graphics', 'Design', 'Branding', 'Icons'],
    'Figma',
    admin_id,
    false,
    false,
    now() - interval '10 days'
  ),
  (
    product4_id,
    'Complete Video Editing Masterclass',
    'Learn professional video editing from scratch. This comprehensive course covers everything from basic cuts to advanced color grading and motion graphics. Includes 20+ hours of video content, project files, and lifetime access.',
    99.99,
    149.99,
    'courses',
    4.9,
    203,
    1567,
    'https://images.pexels.com/photos/257904/pexels-photo-257904.jpeg',
    ARRAY['https://images.pexels.com/photos/257904/pexels-photo-257904.jpeg'],
    '[
      {"name": "20 Video Lessons", "description": "HD quality tutorials"},
      {"name": "Project Files", "description": "Follow along materials"},
      {"name": "Certificate of Completion", "description": "Show your achievement"},
      {"name": "Private Community Access", "description": "Get support & feedback"}
    ]'::jsonb,
    ARRAY['Course', 'Video', 'Education', 'Premiere Pro'],
    'Premiere Pro',
    admin_id,
    true,
    true,
    now() - interval '15 days'
  ),
  (
    product5_id,
    'Notion Content Management System',
    'A complete content management system built in Notion. Track your content ideas, plan your editorial calendar, manage collaborations, and analyze performance - all in one beautiful workspace.',
    39.99,
    NULL,
    'templates',
    4.8,
    178,
    1834,
    'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg',
    ARRAY['https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg'],
    '[
      {"name": "Notion Template", "description": "Duplicate and customize"},
      {"name": "Setup Video Tutorial", "description": "10-minute walkthrough"},
      {"name": "Content Calendar Views", "description": "Multiple perspectives"},
      {"name": "Analytics Dashboard", "description": "Track your performance"}
    ]'::jsonb,
    ARRAY['Notion', 'Productivity', 'Content', 'Organization'],
    'Notion',
    admin_id,
    false,
    false,
    now() - interval '7 days'
  ),
  (
    product6_id,
    'YouTube Thumbnail Template Collection',
    'Stand out with eye-catching thumbnails! This collection includes 100+ proven thumbnail templates designed to increase click-through rates. All templates are fully customizable and optimized for YouTube.',
    24.99,
    34.99,
    'templates',
    4.6,
    267,
    3421,
    'https://images.pexels.com/photos/1624438/pexels-photo-1624438.jpeg',
    ARRAY['https://images.pexels.com/photos/1624438/pexels-photo-1624438.jpeg'],
    '[
      {"name": "100 Thumbnail Templates", "description": "Canva format"},
      {"name": "Text Overlay Pack", "description": "Attention-grabbing fonts"},
      {"name": "Background Collection", "description": "50 premium backgrounds"},
      {"name": "Best Practices Guide", "description": "Psychology of CTR"}
    ]'::jsonb,
    ARRAY['YouTube', 'Templates', 'Thumbnails', 'Design'],
    'Canva',
    admin_id,
    false,
    true,
    now() - interval '3 days'
  ),
  (
    product7_id,
    'Legal Contract Templates Bundle',
    'Protect your business with professionally drafted legal templates. Includes client contracts, NDA, terms of service, privacy policy, and more. Reviewed by legal professionals.',
    149.99,
    NULL,
    'docs',
    4.9,
    67,
    432,
    'https://images.pexels.com/photos/6077326/pexels-photo-6077326.jpeg',
    ARRAY['https://images.pexels.com/photos/6077326/pexels-photo-6077326.jpeg'],
    '[
      {"name": "Client Service Agreement", "description": "Fully customizable DOCX"},
      {"name": "Non-Disclosure Agreement", "description": "Protect your IP"},
      {"name": "Terms of Service Template", "description": "For websites/apps"},
      {"name": "Privacy Policy Template", "description": "GDPR compliant"}
    ]'::jsonb,
    ARRAY['Legal', 'Business', 'Contracts', 'Templates'],
    'Word',
    admin_id,
    false,
    false,
    now() - interval '20 days'
  ),
  (
    product8_id,
    'Email Marketing Automation Kit',
    'Build powerful email funnels that convert. This kit includes welcome sequences, nurture campaigns, sales funnels, and re-engagement emails. Works with all major email platforms.',
    89.99,
    119.99,
    'toolkits',
    4.7,
    134,
    923,
    'https://images.pexels.com/photos/1591062/pexels-photo-1591062.jpeg',
    ARRAY['https://images.pexels.com/photos/1591062/pexels-photo-1591062.jpeg'],
    '[
      {"name": "10 Email Sequence Templates", "description": "Copy-paste ready"},
      {"name": "Subject Line Swipe File", "description": "200 proven winners"},
      {"name": "Campaign Strategy Guide", "description": "Step-by-step PDF"},
      {"name": "A/B Testing Framework", "description": "Optimize performance"}
    ]'::jsonb,
    ARRAY['Email', 'Marketing', 'Automation', 'Sales'],
    'Mailchimp',
    admin_id,
    true,
    true,
    now() - interval '12 days'
  ),
  (
    product9_id,
    'WordPress Blog Theme - Creator Pro',
    'A lightning-fast, SEO-optimized WordPress theme built for content creators. Includes multiple layout options, custom widgets, and full Elementor compatibility.',
    69.99,
    NULL,
    'templates',
    4.8,
    142,
    1289,
    'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg',
    ARRAY['https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg'],
    '[
      {"name": "WordPress Theme Files", "description": "Easy installation"},
      {"name": "Demo Content Import", "description": "One-click setup"},
      {"name": "Documentation PDF", "description": "Complete guide"},
      {"name": "6 Months Support", "description": "Priority assistance"}
    ]'::jsonb,
    ARRAY['WordPress', 'Theme', 'Blog', 'Website'],
    'WordPress',
    admin_id,
    false,
    false,
    now() - interval '8 days'
  ),
  (
    product10_id,
    'Instagram Reels Hooks Library',
    'Stop scrolling with these 500+ proven hooks! This comprehensive library includes categorized hooks for every niche, along with psychological triggers that boost engagement.',
    19.99,
    NULL,
    'docs',
    4.5,
    312,
    4567,
    'https://images.pexels.com/photos/1092671/pexels-photo-1092671.jpeg',
    ARRAY['https://images.pexels.com/photos/1092671/pexels-photo-1092671.jpeg'],
    '[
      {"name": "500 Hooks Database", "description": "Notion + Google Sheets"},
      {"name": "Niche Categories", "description": "20+ industries covered"},
      {"name": "Psychology Guide", "description": "Why hooks work"},
      {"name": "Script Templates", "description": "Full video scripts"}
    ]'::jsonb,
    ARRAY['Instagram', 'Reels', 'Content', 'Copywriting'],
    'Notion',
    admin_id,
    false,
    false,
    now() - interval '4 days'
  ),
  (
    product11_id,
    'Figma UI Kit - SaaS Dashboard',
    'Build beautiful SaaS interfaces in minutes. This comprehensive UI kit includes 200+ components, 50+ pre-built screens, and a complete design system with variables.',
    129.99,
    179.99,
    'graphics',
    4.9,
    98,
    756,
    'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg',
    ARRAY['https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg'],
    '[
      {"name": "200 UI Components", "description": "Fully customizable"},
      {"name": "50 Dashboard Screens", "description": "Light & dark modes"},
      {"name": "Design System", "description": "Colors, typography, spacing"},
      {"name": "Icon Library", "description": "300 custom icons"}
    ]'::jsonb,
    ARRAY['Figma', 'UI Kit', 'Design', 'SaaS'],
    'Figma',
    admin_id,
    true,
    true,
    now() - interval '6 days'
  ),
  (
    product12_id,
    'Content Creator Financial Planner',
    'Take control of your creator finances. This comprehensive Notion template helps you track income, expenses, taxes, and growth metrics. Built specifically for content creators.',
    34.99,
    NULL,
    'templates',
    4.7,
    189,
    1678,
    'https://images.pexels.com/photos/1602726/pexels-photo-1602726.jpeg',
    ARRAY['https://images.pexels.com/photos/1602726/pexels-photo-1602726.jpeg'],
    '[
      {"name": "Income Tracker", "description": "Multiple revenue streams"},
      {"name": "Expense Manager", "description": "Categorized tracking"},
      {"name": "Tax Calculator", "description": "Quarterly estimates"},
      {"name": "Financial Goals Dashboard", "description": "Visual progress"}
    ]'::jsonb,
    ARRAY['Notion', 'Finance', 'Business', 'Templates'],
    'Notion',
    admin_id,
    false,
    false,
    now() - interval '11 days'
  );

END $$;
