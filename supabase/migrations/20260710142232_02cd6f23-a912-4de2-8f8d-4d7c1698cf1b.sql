ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS show_packages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_services boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_branches boolean NOT NULL DEFAULT true;