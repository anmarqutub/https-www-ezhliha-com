
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.subcategories(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_subcategories_parent_id ON public.subcategories(parent_id);

ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS tiktok text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS twitter text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS snapchat text;
