-- Migration to Proper Junction Table Architecture
-- Run this in Supabase SQL Editor

-- 1. Create outfit_items junction table
CREATE TABLE IF NOT EXISTS outfit_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outfit_id UUID REFERENCES outfits(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    slot TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(outfit_id, item_id), -- Prevent duplicate items in same outfit
    UNIQUE(outfit_id, slot)     -- Prevent multiple items in same slot per outfit
);

-- 2. Create bunny_outfits junction table  
CREATE TABLE IF NOT EXISTS bunny_outfits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bunny_id UUID REFERENCES bunnies(id) ON DELETE CASCADE,
    outfit_id UUID REFERENCES outfits(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT FALSE,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bunny_id, outfit_id), -- Bunny can't own same outfit twice
    -- Constraint: Only one active outfit per bunny
    EXCLUDE (bunny_id WITH =) WHERE (is_active = true)
);

-- 3. Enable RLS for new tables
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bunny_outfits ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for outfit_items
CREATE POLICY "outfit_items_select" ON outfit_items FOR SELECT USING (true);
CREATE POLICY "outfit_items_insert" ON outfit_items FOR INSERT WITH CHECK (true);
CREATE POLICY "outfit_items_update" ON outfit_items FOR UPDATE USING (true);
CREATE POLICY "outfit_items_delete" ON outfit_items FOR DELETE USING (true);

-- 5. Create RLS policies for bunny_outfits  
CREATE POLICY "bunny_outfits_select" ON bunny_outfits FOR SELECT USING (true);
CREATE POLICY "bunny_outfits_insert" ON bunny_outfits FOR INSERT WITH CHECK (true);
CREATE POLICY "bunny_outfits_update" ON bunny_outfits FOR UPDATE USING (true);
CREATE POLICY "bunny_outfits_delete" ON bunny_outfits FOR DELETE USING (true);

-- 6. Create indexes for performance
CREATE INDEX idx_outfit_items_outfit_id ON outfit_items(outfit_id);
CREATE INDEX idx_outfit_items_item_id ON outfit_items(item_id);
CREATE INDEX idx_bunny_outfits_bunny_id ON bunny_outfits(bunny_id);
CREATE INDEX idx_bunny_outfits_outfit_id ON bunny_outfits(outfit_id);
CREATE INDEX idx_bunny_outfits_active ON bunny_outfits(bunny_id, is_active) WHERE is_active = true;

-- 7. Remove bunny_id from outfits table (since we'll use bunny_outfits instead)
-- ALTER TABLE outfits DROP COLUMN bunny_id; -- Do this after migration is complete
-- ALTER TABLE outfits DROP COLUMN is_active; -- Do this after migration is complete