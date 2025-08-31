-- Add sample items for testing the inventory system
-- This creates a variety of test items across different slots and categories

INSERT INTO items (id, name, slot, category, item_type, rarity, description, stat_effects, is_purchaseable, cost) VALUES

-- HEAD SLOT ITEMS
('red_beanie', 'Cozy Red Beanie', 'head', 'hat', 'beanie', 'common', 'A warm and cozy red beanie perfect for winter days', '{"whimsy": 5, "comfort": 10}', true, 50),
('wizard_hat', 'Mystical Wizard Hat', 'head', 'hat', 'fun_hat', 'rare', 'A pointy hat that sparkles with magical energy', '{"wisdom": 15, "curiosity": 10}', true, 200),
('baseball_cap', 'Classic Baseball Cap', 'head', 'hat', 'cap', 'common', 'A timeless sporty cap', '{"energy": 8, "connection": 5}', true, 75),
('top_hat', 'Elegant Top Hat', 'head', 'hat', 'formal_hat', 'uncommon', 'A distinguished black top hat for formal occasions', '{"wisdom": 12, "melancholy": 5}', true, 150),
('pink_bow', 'Adorable Pink Bow', 'head', 'hair_accessory', 'bow', 'common', 'A cute pink bow that adds charm', '{"whimsy": 8, "connection": 6}', true, 30),
('star_flower', 'Sparkling Star Flower', 'head', 'hair_accessory', 'flower', 'epic', 'A rare flower that twinkles like stars', '{"stimulation": 20, "whimsy": 15}', true, 500),

-- FACE SLOT ITEMS
('round_glasses', 'Scholarly Round Glasses', 'face', 'glasses', 'reading', 'common', 'Classic round glasses for the intellectual look', '{"wisdom": 10, "curiosity": 8}', true, 100),
('heart_sunglasses', 'Heart-Shaped Sunglasses', 'face', 'glasses', 'sunglasses', 'uncommon', 'Adorable heart-shaped sunglasses', '{"whimsy": 12, "connection": 8}', true, 120),
('aviator_sunglasses', 'Cool Aviator Sunglasses', 'face', 'glasses', 'sunglasses', 'common', 'Classic aviator style sunglasses', '{"energy": 10, "comfort": 5}', true, 90),
('monocle', 'Fancy Monocle', 'face', 'glasses', 'special', 'rare', 'A distinguished single lens eyeglass', '{"wisdom": 18, "melancholy": 8}', true, 250),

-- UPPER BODY SLOT ITEMS
('striped_tee', 'Classic Striped Tee', 'upper_body', 'shirt', 'tshirt', 'common', 'A comfortable striped t-shirt', '{"comfort": 8, "whimsy": 4}', true, 40),
('band_tee', 'Rock Band Tee', 'upper_body', 'shirt', 'tshirt', 'uncommon', 'A vintage band t-shirt with attitude', '{"energy": 12, "stimulation": 8}', true, 80),
('button_up', 'Formal Button-Up Shirt', 'upper_body', 'shirt', 'formal', 'common', 'A crisp white button-up shirt', '{"wisdom": 8, "connection": 6}', true, 110),
('christmas_sweater', 'Festive Christmas Sweater', 'upper_body', 'sweater', 'special', 'rare', 'An incredibly festive holiday sweater', '{"whimsy": 20, "connection": 15, "comfort": 10}', true, 180),
('cable_knit', 'Warm Cable Knit Sweater', 'upper_body', 'sweater', 'pullover', 'common', 'A cozy cable knit sweater', '{"comfort": 15, "melancholy": -5}', true, 95),
('hoodie', 'Comfortable Hoodie', 'upper_body', 'sweater', 'special', 'common', 'A soft and comfortable hoodie', '{"comfort": 12, "energy": 6}', true, 70),

-- ACCESSORY SLOT ITEMS  
('friendship_bracelet', 'Colorful Friendship Bracelet', 'accessory', 'jewelry', 'bracelet', 'common', 'A hand-woven bracelet symbolizing friendship', '{"connection": 15, "whimsy": 5}', true, 25),
('pocket_watch', 'Vintage Pocket Watch', 'accessory', 'jewelry', 'watch', 'rare', 'An elegant antique pocket watch', '{"wisdom": 15, "melancholy": 10}', true, 300),
('lucky_charm', 'Four-Leaf Clover Charm', 'accessory', 'charm', 'lucky', 'epic', 'A rare four-leaf clover that brings good fortune', '{"curiosity": 12, "whimsy": 18, "energy": 8}', true, 450),

-- STARTER ITEMS (free items all new bunnies get)
('plain_tee', 'Plain White Tee', 'upper_body', 'shirt', 'tshirt', 'common', 'A simple white t-shirt', '{"comfort": 5}', false, 0),
('basic_cap', 'Basic Cap', 'head', 'hat', 'cap', 'common', 'A simple everyday cap', '{"energy": 3}', false, 0);

-- Update starter items flag
UPDATE items SET is_starter_item = true WHERE id IN ('plain_tee', 'basic_cap');