-- Add rendering_instructions column to items table for item-specific Gemini prompts
ALTER TABLE items ADD COLUMN rendering_instructions TEXT;

-- Add specific rendering instructions for problematic items
UPDATE items SET rendering_instructions = 'Position high heels so the bunny''s feet are properly inside the shoes, with the heel extending behind the bunny''s paw. The bunny should appear to be standing on the heels naturally, with proper ankle positioning. Scale the heels appropriately for bunny proportions.' WHERE id = 'high_heels';

UPDATE items SET rendering_instructions = 'Position dress shoes so they fit snugly around the bunny''s paws, replacing the original feet. The shoes should look like they belong on the bunny''s feet, not floating or oversized.' WHERE id = 'dress_shoes';

UPDATE items SET rendering_instructions = 'Position boots so the bunny''s legs disappear into the boot opening, with the bunny standing naturally. The boots should appear to be worn by the bunny, not placed next to it.' WHERE id IN ('leather_boots', 'combat_boots', 'rain_boots');

UPDATE items SET rendering_instructions = 'Position sneakers to fit naturally on the bunny''s feet, with proper proportions for bunny anatomy. The sneakers should replace the original bunny feet and look like they belong.' WHERE id = 'sneakers';

UPDATE items SET rendering_instructions = 'Position sandals so the bunny''s toes are visible and properly positioned within the sandal straps. The sandals should appear to be worn on the bunny''s feet naturally.' WHERE id = 'sandals';

-- Add instructions for other problematic slots
UPDATE items SET rendering_instructions = 'Position hat/headwear to fit naturally on the bunny''s head between the ears, not covering the ears unless it''s meant to. Scale appropriately for bunny head size.' WHERE slot = 'head' AND rendering_instructions IS NULL;

UPDATE items SET rendering_instructions = 'Position glasses/face accessories to fit the bunny''s face shape naturally, with proper scaling for bunny facial features.' WHERE slot = 'face' AND rendering_instructions IS NULL;

-- Comment explaining the column
COMMENT ON COLUMN items.rendering_instructions IS 'Item-specific instructions for AI image generation to improve positioning, scaling, and integration with bunny anatomy';