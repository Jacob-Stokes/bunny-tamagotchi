-- Create scenes table
CREATE TABLE scenes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  background_image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default scenes
INSERT INTO scenes (id, name, description, background_image_url) VALUES
  ('meadow', 'Sunny Meadow', 'beautiful sunny meadow scene with soft green grass, blue sky with fluffy white clouds, and colorful flowers scattered around', '/scenes/meadow.png'),
  ('forest', 'Enchanted Forest', 'enchanted forest with tall trees, dappled sunlight filtering through leaves, mushrooms, and fairy lights twinkling in the background', '/scenes/forest.png'),
  ('beach', 'Tropical Beach', 'tropical beach with palm trees, clear blue ocean waves, seashells scattered on golden sand, and warm sunlight', '/scenes/beach.png'),
  ('garden', 'Flower Garden', 'lush flower garden with roses, butterflies dancing around, stone pathways, and a gentle fountain in the background', '/scenes/garden.png'),
  ('snowy', 'Winter Wonderland', 'winter wonderland with evergreen trees covered in snow, soft falling snowflakes, and a cozy winter atmosphere', '/scenes/snowy.png'),
  ('space', 'Cosmic Dreams', 'dreamy space scene with twinkling stars, distant planets, colorful nebula clouds, and floating cosmic elements', '/scenes/space.png'),
  ('library', 'Magical Library', 'warm library interior with tall bookshelves filled with books, soft golden lighting, comfortable reading nooks, and magical floating books', '/scenes/library.png'),
  ('cafe', 'Cozy Cafe', 'charming cafe setting with cute pastries on display, steaming coffee cups, warm ambient lighting, and cozy indoor atmosphere', '/scenes/cafe.png');

-- Enable RLS
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

-- Allow all users to read scenes
CREATE POLICY "Allow public read access to scenes" ON scenes
  FOR SELECT USING (true);

-- Allow authenticated users to manage scenes (for admin)
CREATE POLICY "Allow authenticated users to manage scenes" ON scenes
  FOR ALL USING (auth.uid() IS NOT NULL);