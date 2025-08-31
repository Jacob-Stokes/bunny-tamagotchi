-- Fix items table RLS policies to allow admin operations
-- The items table needs INSERT, UPDATE, DELETE policies for authenticated users

-- Allow authenticated users to insert items (for admin functionality)
CREATE POLICY "Authenticated users can insert items" ON items
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow authenticated users to update items (for admin functionality)
CREATE POLICY "Authenticated users can update items" ON items
  FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete items (for admin functionality)
CREATE POLICY "Authenticated users can delete items" ON items
  FOR DELETE 
  TO authenticated 
  USING (true);