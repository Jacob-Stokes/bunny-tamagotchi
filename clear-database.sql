-- Clear all generated data while preserving core setup
-- This will reset bunnies to a clean state

-- Clear bunny equipment (what items bunnies are wearing)
DELETE FROM bunny_equipment;

-- Clear bunny inventory (what items bunnies own)
DELETE FROM bunny_inventory;

-- Clear saved outfits
DELETE FROM outfits;

-- Clear outfit favourites
DELETE FROM outfit_favourites;

-- Clear outfit generation limits (reset daily limits)
DELETE FROM outfit_generation_limits;

-- Reset bunny stats to default values and clear names
UPDATE bunnies SET 
  name = 'Bunny',
  connection = 50,
  stimulation = 50,
  comfort = 50,
  energy = 50,
  curiosity = 50,
  whimsy = 50,
  melancholy = 50,
  wisdom = 50,
  coins = 100,
  experience = 0,
  updated_at = NOW();

-- Show final state
SELECT 'Bunnies after reset:' as info;
SELECT id, name, connection, stimulation, comfort, energy, coins FROM bunnies;

SELECT 'Equipment count:' as info, count(*) as count FROM bunny_equipment;
SELECT 'Inventory count:' as info, count(*) as count FROM bunny_inventory;
SELECT 'Outfits count:' as info, count(*) as count FROM outfits;