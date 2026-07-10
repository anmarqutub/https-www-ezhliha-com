ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id);
CREATE INDEX IF NOT EXISTS idx_branches_city_id ON public.branches(city_id);