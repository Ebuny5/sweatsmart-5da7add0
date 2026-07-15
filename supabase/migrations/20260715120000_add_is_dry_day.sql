-- Add is_dry_day to episodes table
ALTER TABLE episodes ADD COLUMN is_dry_day BOOLEAN DEFAULT false;
