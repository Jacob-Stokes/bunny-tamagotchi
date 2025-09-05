-- Add status column to track outfit generation completion
ALTER TABLE outfits ADD COLUMN status VARCHAR(20) DEFAULT 'completed' NOT NULL;

-- Add check constraint for valid status values
ALTER TABLE outfits ADD CONSTRAINT check_outfit_status 
  CHECK (status IN ('pending', 'generating', 'completed', 'failed'));

-- Create index on status for filtering
CREATE INDEX idx_outfits_status ON outfits(status);

-- Update existing outfits to 'completed' status (they already exist)
UPDATE outfits SET status = 'completed' WHERE status IS NULL OR status = 'completed';