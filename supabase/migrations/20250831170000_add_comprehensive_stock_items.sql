-- Add comprehensive stock items for character customization
-- This creates a full collection of items across all slots for testing and gameplay

INSERT INTO items (id, name, slot, category, item_type, rarity, description, stat_effects, is_purchaseable, cost) VALUES

-- HEAD SLOT ITEMS (Additional)
('crown', 'Royal Golden Crown', 'head', 'hat', 'royal', 'legendary', 'A majestic golden crown fit for royalty', '{"wisdom": 25, "connection": 20, "melancholy": -10}', true, 1000),
('pirate_hat', 'Swashbuckling Pirate Hat', 'head', 'hat', 'costume', 'uncommon', 'A classic tricorn pirate hat with feather', '{"curiosity": 15, "energy": 10}', true, 130),
('chef_hat', 'Professional Chef Hat', 'head', 'hat', 'professional', 'common', 'A tall white chef''s toque', '{"wisdom": 8, "comfort": 6}', true, 85),
('winter_hat', 'Warm Winter Hat', 'head', 'hat', 'seasonal', 'common', 'A cozy winter hat with ear flaps', '{"comfort": 12, "melancholy": -3}', true, 60),
('beret', 'Artistic Beret', 'head', 'hat', 'artistic', 'uncommon', 'A stylish black beret for creative types', '{"whimsy": 12, "wisdom": 8}', true, 95),
('cowboy_hat', 'Classic Cowboy Hat', 'head', 'hat', 'western', 'uncommon', 'A traditional brown cowboy hat', '{"energy": 12, "curiosity": 8}', true, 140),

-- FACE SLOT ITEMS (Additional)
('cat_eye_glasses', 'Retro Cat Eye Glasses', 'face', 'glasses', 'vintage', 'uncommon', 'Stylish cat eye frame glasses', '{"whimsy": 10, "wisdom": 6}', true, 105),
('3d_glasses', '3D Cinema Glasses', 'face', 'glasses', 'special', 'common', 'Classic red and blue 3D glasses', '{"stimulation": 8, "whimsy": 12}', true, 45),
('eye_patch', 'Mysterious Eye Patch', 'face', 'accessory', 'pirate', 'uncommon', 'A black eye patch for that pirate look', '{"curiosity": 15, "melancholy": 8}', true, 75),
('masquerade_mask', 'Elegant Masquerade Mask', 'face', 'mask', 'formal', 'rare', 'A ornate mask for fancy occasions', '{"whimsy": 18, "connection": 12}', true, 220),
('safety_goggles', 'Science Safety Goggles', 'face', 'glasses', 'science', 'common', 'Clear protective goggles for experiments', '{"wisdom": 12, "curiosity": 10}', true, 65),

-- UPPER BODY ITEMS (Additional)
('tuxedo', 'Formal Tuxedo', 'upper_body', 'suit', 'formal', 'rare', 'An elegant black tuxedo', '{"wisdom": 15, "connection": 18, "comfort": -5}', true, 350),
('lab_coat', 'Scientist Lab Coat', 'upper_body', 'coat', 'professional', 'uncommon', 'A crisp white laboratory coat', '{"wisdom": 18, "curiosity": 12}', true, 125),
('denim_jacket', 'Classic Denim Jacket', 'upper_body', 'jacket', 'casual', 'common', 'A timeless blue denim jacket', '{"energy": 10, "comfort": 8}', true, 90),
('hawaiian_shirt', 'Tropical Hawaiian Shirt', 'upper_body', 'shirt', 'tropical', 'uncommon', 'A colorful shirt with tropical prints', '{"whimsy": 15, "energy": 12, "comfort": 8}', true, 85),
('superhero_cape', 'Heroic Red Cape', 'upper_body', 'cape', 'superhero', 'epic', 'A flowing red cape for heroes', '{"energy": 20, "connection": 15, "curiosity": 10}', true, 400),
('raincoat', 'Yellow Raincoat', 'upper_body', 'coat', 'weather', 'common', 'A bright yellow raincoat', '{"comfort": 10, "melancholy": -8}', true, 70),
('varsity_jacket', 'School Varsity Jacket', 'upper_body', 'jacket', 'school', 'uncommon', 'A classic letterman jacket', '{"energy": 15, "connection": 10}', true, 160),

-- LOWER BODY ITEMS
('blue_jeans', 'Classic Blue Jeans', 'lower_body', 'pants', 'casual', 'common', 'Comfortable blue denim jeans', '{"comfort": 8, "energy": 4}', true, 55),
('dress_pants', 'Formal Dress Pants', 'lower_body', 'pants', 'formal', 'common', 'Sharp black dress pants', '{"wisdom": 6, "connection": 8}', true, 80),
('cargo_shorts', 'Practical Cargo Shorts', 'lower_body', 'shorts', 'casual', 'common', 'Shorts with lots of pockets', '{"energy": 10, "curiosity": 6}', true, 45),
('pleated_skirt', 'School Pleated Skirt', 'lower_body', 'skirt', 'school', 'common', 'A classic pleated school skirt', '{"whimsy": 8, "connection": 6}', true, 50),
('tutu', 'Ballet Tutu', 'lower_body', 'skirt', 'dance', 'uncommon', 'A frilly pink ballet tutu', '{"whimsy": 18, "energy": 10}', true, 120),
('leather_pants', 'Cool Leather Pants', 'lower_body', 'pants', 'rock', 'rare', 'Black leather pants for that rock star look', '{"energy": 18, "stimulation": 12}', true, 280),

-- FEET ITEMS
('sneakers', 'Comfortable Sneakers', 'feet', 'shoes', 'athletic', 'common', 'Classic white athletic sneakers', '{"energy": 12, "comfort": 8}', true, 65),
('dress_shoes', 'Polished Dress Shoes', 'feet', 'shoes', 'formal', 'common', 'Shiny black formal shoes', '{"wisdom": 8, "connection": 6}', true, 95),
('rain_boots', 'Yellow Rain Boots', 'feet', 'boots', 'weather', 'common', 'Bright yellow rubber boots for puddles', '{"whimsy": 10, "comfort": 6, "melancholy": -5}', true, 40),
('cowboy_boots', 'Leather Cowboy Boots', 'feet', 'boots', 'western', 'uncommon', 'Classic brown leather cowboy boots', '{"energy": 15, "curiosity": 8}', true, 140),
('ballet_slippers', 'Pink Ballet Slippers', 'feet', 'shoes', 'dance', 'uncommon', 'Delicate pink ballet shoes', '{"whimsy": 12, "energy": 8, "comfort": 10}', true, 75),
('flip_flops', 'Beach Flip Flops', 'feet', 'sandals', 'beach', 'common', 'Casual beach flip flops', '{"comfort": 10, "whimsy": 5}', true, 25),
('hiking_boots', 'Sturdy Hiking Boots', 'feet', 'boots', 'outdoor', 'uncommon', 'Durable boots for outdoor adventures', '{"energy": 18, "curiosity": 12, "comfort": 8}', true, 110),
('high_heels', 'Elegant High Heels', 'feet', 'shoes', 'formal', 'uncommon', 'Stylish black high heel shoes', '{"connection": 15, "wisdom": 8, "comfort": -8}', true, 125),

-- ACCESSORY ITEMS (Additional)
('backpack', 'Adventure Backpack', 'accessory', 'bag', 'utility', 'common', 'A practical backpack for adventures', '{"curiosity": 10, "energy": 8}', true, 80),
('pearl_necklace', 'Elegant Pearl Necklace', 'accessory', 'jewelry', 'formal', 'rare', 'A classic string of pearls', '{"connection": 18, "wisdom": 10}', true, 320),
('gold_watch', 'Luxury Gold Watch', 'accessory', 'jewelry', 'luxury', 'epic', 'An expensive gold wristwatch', '{"wisdom": 20, "connection": 15, "melancholy": 5}', true, 650),
('rubber_duck', 'Cute Rubber Duck', 'accessory', 'toy', 'fun', 'common', 'A squeaky yellow rubber duck companion', '{"whimsy": 15, "comfort": 8, "melancholy": -10}', true, 15),
('magic_wand', 'Sparkly Magic Wand', 'accessory', 'magic', 'fantasy', 'rare', 'A wand that sparkles with magical energy', '{"whimsy": 20, "curiosity": 15, "stimulation": 10}', true, 275),
('teddy_bear', 'Cuddly Teddy Bear', 'accessory', 'toy', 'comfort', 'uncommon', 'A soft brown teddy bear for comfort', '{"comfort": 20, "connection": 12, "melancholy": -12}', true, 90),
('bowtie', 'Dapper Bow Tie', 'accessory', 'formal', 'tie', 'common', 'A classic black bow tie', '{"wisdom": 8, "connection": 10}', true, 35),
('flower_crown', 'Daisy Flower Crown', 'accessory', 'nature', 'crown', 'uncommon', 'A crown made of fresh daisies', '{"whimsy": 15, "connection": 10, "comfort": 8}', true, 55);