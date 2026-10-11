CREATE TABLE public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insert" ON public.user_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read" ON public.user_locations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ON public.user_locations (user_id, created_at DESC);
UPDATE public.site_texts SET value = replace(value, 'Powered by AQ', 'Powered by ANQ') WHERE key = 'footer.copy';