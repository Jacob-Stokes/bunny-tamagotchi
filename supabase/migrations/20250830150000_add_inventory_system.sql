-- Add inventory and equipment system
-- Migration: Add items, bunny_inventory, and bunny_equipment tables

-- Items table (global item definitions)
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, -- e.g., "red_beanie"
  name TEXT NOT NULL, -- e.g., "Cozy Red Beanie"
  slot TEXT NOT NULL, -- e.g., "head", "face", "upper_body"
  category TEXT NOT NULL, -- e.g., "hat", "glasses", "shirt"
  item_type TEXT NOT NULL, -- e.g., "beanie", "sunglasses", "tshirt"
  rarity TEXT NOT NULL DEFAULT 'common', -- common, uncommon, rare, legendary
  description TEXT,
  image_url TEXT,
  
  -- Stat effects (JSON for flexibility)
  stat_effects JSONB DEFAULT '{}', -- {"whimsy": 5, "comfort": 10}
  
  -- Acquisition info
  cost INTEGER DEFAULT 0, -- if purchaseable
  is_purchaseable BOOLEAN DEFAULT false,
  is_starter_item BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (slot IN ('head', 'face', 'upper_body', 'lower_body', 'feet', 'accessory')),
  CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  CHECK (cost >= 0)
);

-- Bunny inventory table (what items they own)
CREATE TABLE IF NOT EXISTS bunny_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bunny_id UUID REFERENCES bunnies(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (quantity > 0),
  UNIQUE(bunny_id, item_id) -- One entry per item per bunny
);

-- Bunny equipment table (what they're currently wearing)
CREATE TABLE IF NOT EXISTS bunny_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bunny_id UUID REFERENCES bunnies(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  equipped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (slot IN ('head', 'face', 'upper_body', 'lower_body', 'feet', 'accessory')),
  UNIQUE(bunny_id, slot) -- One item per slot per bunny
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bunny_inventory_bunny_id ON bunny_inventory(bunny_id);
CREATE INDEX IF NOT EXISTS idx_bunny_inventory_item_id ON bunny_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_bunny_equipment_bunny_id ON bunny_equipment(bunny_id);
CREATE INDEX IF NOT EXISTS idx_bunny_equipment_slot ON bunny_equipment(bunny_id, slot);

-- Items organized by slot and category
CREATE INDEX IF NOT EXISTS idx_items_slot_category ON items(slot, category);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);

-- Row Level Security for inventory tables
ALTER TABLE bunny_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE bunny_equipment ENABLE ROW LEVEL SECURITY;

-- Policies for bunny_inventory (users can only see their own bunny's inventory)
CREATE POLICY "Users can only see their own bunny inventory" ON bunny_inventory
  FOR ALL USING (
    bunny_id IN (
      SELECT id FROM bunnies WHERE user_id = auth.uid()
    )
  );

-- Policies for bunny_equipment (users can only see their own bunny's equipment)
CREATE POLICY "Users can only see their own bunny equipment" ON bunny_equipment
  FOR ALL USING (
    bunny_id IN (
      SELECT id FROM bunnies WHERE user_id = auth.uid()
    )
  );

-- Items table is public (everyone can read item definitions)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items are publicly readable" ON items
  FOR SELECT USING (true);