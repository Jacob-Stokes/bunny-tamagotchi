-- Create outfits table for storing saved bunny outfits
CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bunny_id UUID NOT NULL REFERENCES bunnies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  equipped_items JSONB NOT NULL DEFAULT '[]', -- Array of equipped item objects
  equipment_signature VARCHAR(255) NOT NULL, -- Unique signature for this equipment combo
  base_bunny VARCHAR(100) NOT NULL DEFAULT 'base-bunny-transparent.png',
  scene VARCHAR(100) NOT NULL DEFAULT 'meadow',
  image_urls JSONB NOT NULL DEFAULT '{}', -- {normal, blink, smile, wave} URLs
  is_active BOOLEAN DEFAULT false, -- Whether this is the currently worn outfit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on bunny_id for fast lookups
CREATE INDEX idx_outfits_bunny_id ON outfits(bunny_id);

-- Create index on user_id for user outfit queries
CREATE INDEX idx_outfits_user_id ON outfits(user_id);

-- Create unique index on bunny_id + equipment_signature to prevent duplicates
CREATE UNIQUE INDEX idx_outfits_unique_combination ON outfits(bunny_id, equipment_signature);

-- Create index for active outfit lookups
CREATE INDEX idx_outfits_active ON outfits(bunny_id) WHERE is_active = true;

-- Create outfit generation limits table
CREATE TABLE outfit_generation_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  generations_used INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 10, -- Default 10 outfits per day
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on user_id + date for daily limits
CREATE UNIQUE INDEX idx_outfit_limits_user_date ON outfit_generation_limits(user_id, date);

-- RLS Policies for outfits table
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own outfits
CREATE POLICY "Users can view own outfits" ON outfits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own outfits
CREATE POLICY "Users can create own outfits" ON outfits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own outfits
CREATE POLICY "Users can update own outfits" ON outfits
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own outfits
CREATE POLICY "Users can delete own outfits" ON outfits
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for outfit_generation_limits table
ALTER TABLE outfit_generation_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own limits
CREATE POLICY "Users can view own generation limits" ON outfit_generation_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own limits
CREATE POLICY "Users can create own generation limits" ON outfit_generation_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own limits
CREATE POLICY "Users can update own generation limits" ON outfit_generation_limits
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_outfits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for outfits updated_at
CREATE TRIGGER update_outfits_updated_at_trigger
  BEFORE UPDATE ON outfits
  FOR EACH ROW
  EXECUTE FUNCTION update_outfits_updated_at();

-- Create function to update outfit limits updated_at timestamp
CREATE OR REPLACE FUNCTION update_outfit_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for outfit_generation_limits updated_at
CREATE TRIGGER update_outfit_limits_updated_at_trigger
  BEFORE UPDATE ON outfit_generation_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_outfit_limits_updated_at();