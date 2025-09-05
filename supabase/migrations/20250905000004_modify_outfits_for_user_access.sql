-- Modify outfits table to support user-based access instead of bunny-specific
-- This allows any bunny owned by a user to wear outfits created by that user

-- Add a flag to mark outfits as global (available to all users)
ALTER TABLE outfits ADD COLUMN is_global BOOLEAN DEFAULT false;

-- Add index for global outfits
CREATE INDEX idx_outfits_global ON outfits(is_global) WHERE is_global = true;

-- Update existing imported outfits to be global so they show for everyone
UPDATE outfits SET is_global = true WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Add comment explaining the access model
COMMENT ON COLUMN outfits.is_global IS 'If true, outfit is available to all users. If false, only available to the user who created it and their bunnies.';