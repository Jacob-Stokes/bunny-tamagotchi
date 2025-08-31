-- Create the bunnies table
CREATE TABLE IF NOT EXISTS bunnies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Bunny',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Visible stats (0-100)
  connection INTEGER DEFAULT 50 CHECK (connection >= 0 AND connection <= 100),
  stimulation INTEGER DEFAULT 60 CHECK (stimulation >= 0 AND stimulation <= 100),
  comfort INTEGER DEFAULT 70 CHECK (comfort >= 0 AND comfort <= 100),
  energy INTEGER DEFAULT 80 CHECK (energy >= 0 AND energy <= 100),
  
  -- Hidden stats (0-100)
  curiosity INTEGER DEFAULT 40 CHECK (curiosity >= 0 AND curiosity <= 100),
  whimsy INTEGER DEFAULT 50 CHECK (whimsy >= 0 AND whimsy <= 100),
  melancholy INTEGER DEFAULT 30 CHECK (melancholy >= 0 AND melancholy <= 100),
  wisdom INTEGER DEFAULT 20 CHECK (wisdom >= 0 AND wisdom <= 100)
);

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS bunnies_user_id_idx ON bunnies(user_id);

-- Enable Row Level Security
ALTER TABLE bunnies ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only see their own bunnies
CREATE POLICY "Users can only see their own bunnies" ON bunnies
  FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bunnies_updated_at 
  BEFORE UPDATE ON bunnies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();