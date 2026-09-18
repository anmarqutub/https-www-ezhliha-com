CREATE TABLE public.provider_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, subcategory_id)
);

GRANT SELECT ON public.provider_subcategories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_subcategories TO authenticated;
GRANT ALL ON public.provider_subcategories TO service_role;

ALTER TABLE public.provider_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read provider_subcategories"
  ON public.provider_subcategories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admins manage provider_subcategories"
  ON public.provider_subcategories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_provider_subcategories_provider ON public.provider_subcategories(provider_id);
CREATE INDEX idx_provider_subcategories_sub ON public.provider_subcategories(subcategory_id);