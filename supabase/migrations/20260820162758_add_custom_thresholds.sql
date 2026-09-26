-- Add custom_thresholds to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_thresholds JSONB;
