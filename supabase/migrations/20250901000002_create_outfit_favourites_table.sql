-- Create outfit favourites table for storing user favourite outfits
CREATE TABLE outfit_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_key VARCHAR(255) NOT NULL, -- The outfit cache key (equipment signature + base + scene)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX idx_outfit_favourites_user_id ON outfit_favourites(user_id);

-- Create unique index on user_id + outfit_key to prevent duplicates
CREATE UNIQUE INDEX idx_outfit_favourites_unique ON outfit_favourites(user_id, outfit_key);

-- RLS Policies for outfit_favourites table
ALTER TABLE outfit_favourites ENABLE ROW LEVEL SECURITY;

-- Users can only see their own favourites
CREATE POLICY "Users can view own favourites" ON outfit_favourites
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own favourites
CREATE POLICY "Users can create own favourites" ON outfit_favourites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favourites
CREATE POLICY "Users can delete own favourites" ON outfit_favourites
  FOR DELETE USING (auth.uid() = user_id);