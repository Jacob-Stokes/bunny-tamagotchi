-- Migration to normalize outfit naming convention
-- Adds folder_number and display_name columns to outfits table

-- Add new columns to outfits table
ALTER TABLE outfits ADD COLUMN IF NOT EXISTS folder_number INTEGER;
ALTER TABLE outfits ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create index for folder_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_outfits_folder_number ON outfits(folder_number);

-- Add comments for documentation
COMMENT ON COLUMN outfits.folder_number IS 'Sequential number for outfit folder (e.g., 1, 2, 3) used in file system as 00000001, 00000002, etc.';
COMMENT ON COLUMN outfits.display_name IS 'Human-readable name for the outfit displayed in UI (e.g., "Mystical Wizard Hat + Pink Ballet Slippers")';

-- The existing name column will be used for technical/system purposes
-- The new display_name column will be used for user-facing display
-- The new folder_number will be used for file system organization