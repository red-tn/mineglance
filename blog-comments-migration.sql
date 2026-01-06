-- ===========================================
-- MineGlance Blog Comments Migration
-- Run this SQL in Supabase SQL Editor
-- ===========================================

-- 1. Add blog_display_name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS blog_display_name TEXT UNIQUE;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_blog_display_name ON users(blog_display_name);

-- 3. Create fake users for commenting (these will be used for demo comments)
-- First, let's create some users that will be used for comments
INSERT INTO users (id, email, password_hash, plan, blog_display_name, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'btcminer2024@demo.local', 'DEMO_USER_NO_LOGIN', 'free', 'BTCMaximalist', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'gpufarmer@demo.local', 'DEMO_USER_NO_LOGIN', 'free', 'GPUFarmer99', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'hashrateking@demo.local', 'DEMO_USER_NO_LOGIN', 'pro', 'HashRateKing', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', 'cryptominer42@demo.local', 'DEMO_USER_NO_LOGIN', 'free', 'CryptoMiner42', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000005', 'ethclassic@demo.local', 'DEMO_USER_NO_LOGIN', 'pro', 'ETCBeliever', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000006', 'rvnminer@demo.local', 'DEMO_USER_NO_LOGIN', 'free', 'RavenMiner', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000007', 'solominer@demo.local', 'DEMO_USER_NO_LOGIN', 'pro', 'SoloMiningPro', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000008', 'poolhopper@demo.local', 'DEMO_USER_NO_LOGIN', 'free', 'PoolHopper2024', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000009', 'asicfarm@demo.local', 'DEMO_USER_NO_LOGIN', 'bundle', 'ASICFarmOp', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000010', 'profitseeker@demo.local', 'DEMO_USER_NO_LOGIN', 'free', 'ProfitSeeker', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET blog_display_name = EXCLUDED.blog_display_name;

-- 4. Add comments to blog posts
-- This inserts comments for ALL published blog posts

-- Comment templates with realistic mining-related content
DO $$
DECLARE
  post_record RECORD;
  user_ids TEXT[] := ARRAY[
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000010'
  ];
  comments_text TEXT[][] := ARRAY[
    ARRAY['Great article! This really helped me understand the basics.', 'Thanks for breaking this down so clearly. Been mining for 2 years and still learned something new.'],
    ARRAY['Finally someone explains this properly! Most guides are way too technical.', 'This is exactly what I needed to read before setting up my new rig.'],
    ARRAY['Solid information here. I''ve been doing this wrong for months apparently.', 'Any tips for someone just starting out? My hashrate seems low.'],
    ARRAY['Been waiting for an article like this. Shared it with my mining group.', 'The electricity cost calculations are spot on. This is the real cost nobody talks about.'],
    ARRAY['This changed how I think about my mining setup. Time to optimize!', 'Excellent breakdown of the pros and cons. Very balanced perspective.'],
    ARRAY['I wish I had read this before buying my equipment. Would have saved me money.', 'MineGlance has been super helpful for tracking my profits across pools.'],
    ARRAY['The pool comparison section was really useful. Switching pools now!', 'Glad to see someone covering this topic. Not enough good content out there.'],
    ARRAY['Can confirm these numbers are accurate based on my own experience.', 'This is why I use MineGlance - keeps everything in one place.'],
    ARRAY['Bookmarked this for future reference. Essential reading for miners.', 'My ROI improved significantly after following this advice.'],
    ARRAY['Great timing on this article. Market conditions are perfect for this strategy.', 'Love the detailed analysis. More content like this please!']
  ];
  random_user_idx INT;
  random_comment_idx INT;
  comment_count INT;
  i INT;
  base_date TIMESTAMP;
BEGIN
  -- Loop through all published blog posts
  FOR post_record IN
    SELECT id, created_at FROM blog_posts WHERE status = 'published'
  LOOP
    -- Each post gets 2-5 random comments
    comment_count := 2 + floor(random() * 4)::INT;
    base_date := post_record.created_at + interval '1 day';

    FOR i IN 1..comment_count LOOP
      -- Pick random user and comment
      random_user_idx := 1 + floor(random() * 10)::INT;
      random_comment_idx := 1 + floor(random() * 2)::INT;

      -- Insert comment with staggered dates
      INSERT INTO blog_comments (
        post_id,
        user_id,
        content,
        is_approved,
        is_flagged,
        created_at,
        updated_at
      ) VALUES (
        post_record.id,
        user_ids[random_user_idx]::UUID,
        comments_text[random_user_idx][random_comment_idx],
        true,
        false,
        base_date + (i * interval '2 hours') + (random() * interval '3 days'),
        NOW()
      );
    END LOOP;
  END LOOP;
END $$;

-- 5. Add some replies to random comments
DO $$
DECLARE
  comment_record RECORD;
  reply_texts TEXT[] := ARRAY[
    'Totally agree with this!',
    'Same experience here. Good to know I''m not alone.',
    'Thanks for the tip, I''ll try that.',
    'This worked for me too!',
    'Great point, never thought about it that way.',
    'Exactly what I was thinking.',
    'Can confirm, this is the way.',
    'Interesting perspective, thanks for sharing.'
  ];
  user_ids TEXT[] := ARRAY[
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005'
  ];
  random_idx INT;
BEGIN
  -- Add replies to about 30% of top-level comments
  FOR comment_record IN
    SELECT id, created_at, user_id, post_id
    FROM blog_comments
    WHERE parent_id IS NULL
    AND random() < 0.3
    LIMIT 20
  LOOP
    random_idx := 1 + floor(random() * 5)::INT;

    -- Make sure reply is from different user than original comment
    IF user_ids[random_idx]::UUID != comment_record.user_id THEN
      INSERT INTO blog_comments (
        post_id,
        user_id,
        parent_id,
        content,
        is_approved,
        is_flagged,
        created_at,
        updated_at
      ) VALUES (
        comment_record.post_id,
        user_ids[random_idx]::UUID,
        comment_record.id,
        reply_texts[1 + floor(random() * 8)::INT],
        true,
        false,
        comment_record.created_at + interval '1 hour' + (random() * interval '2 days'),
        NOW()
      );
    END IF;
  END LOOP;
END $$;

-- 6. Add a few admin responses
UPDATE blog_comments
SET admin_response = 'Thanks for the feedback! Glad you found this helpful.',
    updated_at = NOW()
WHERE id IN (
  SELECT id FROM blog_comments
  WHERE parent_id IS NULL
  AND admin_response IS NULL
  ORDER BY random()
  LIMIT 5
);

UPDATE blog_comments
SET admin_response = 'Great question! We''ll cover this in more detail in an upcoming article.',
    updated_at = NOW()
WHERE id IN (
  SELECT id FROM blog_comments
  WHERE parent_id IS NULL
  AND admin_response IS NULL
  AND content LIKE '%?%'
  ORDER BY random()
  LIMIT 3
);

-- 7. Summary of what was created
SELECT
  'Blog posts with comments' as metric,
  COUNT(DISTINCT post_id) as count
FROM blog_comments
UNION ALL
SELECT
  'Total comments created' as metric,
  COUNT(*) as count
FROM blog_comments
UNION ALL
SELECT
  'Top-level comments' as metric,
  COUNT(*) as count
FROM blog_comments WHERE parent_id IS NULL
UNION ALL
SELECT
  'Replies' as metric,
  COUNT(*) as count
FROM blog_comments WHERE parent_id IS NOT NULL
UNION ALL
SELECT
  'Admin responses' as metric,
  COUNT(*) as count
FROM blog_comments WHERE admin_response IS NOT NULL;
