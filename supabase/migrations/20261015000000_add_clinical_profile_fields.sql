-- Add clinical profile fields to public.profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onset_bracket TEXT,
ADD COLUMN IF NOT EXISTS family_history TEXT,
ADD COLUMN IF NOT EXISTS night_sweats TEXT,
ADD COLUMN IF NOT EXISTS on_medication BOOLEAN,
ADD COLUMN IF NOT EXISTS conditions TEXT[];
