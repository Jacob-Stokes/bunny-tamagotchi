-- Emergency database debug queries
-- Run these in Supabase SQL editor to check what's wrong

-- 1. Check all bunnies
SELECT id, user_id, name, created_at FROM bunnies;

-- 2. Check bunny equipment 
SELECT * FROM bunny_equipment;

-- 3. Check bunny inventory
SELECT * FROM bunny_inventory;

-- 4. Check items and their stat_effects
SELECT id, name, stat_effects, image_url FROM items LIMIT 10;

-- 5. Check if there are any corrupted stat_effects
SELECT id, name, stat_effects, length(stat_effects::text) as stat_length 
FROM items 
WHERE length(stat_effects::text) > 100;

-- 6. Reset corrupted items (if needed)
-- UPDATE items SET stat_effects = '{}' WHERE length(stat_effects::text) > 100;