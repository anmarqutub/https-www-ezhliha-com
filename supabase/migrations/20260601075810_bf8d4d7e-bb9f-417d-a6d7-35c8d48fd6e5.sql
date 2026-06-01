
CREATE TABLE public.purchase_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  email text,
  note text,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.purchase_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_codes TO authenticated;
GRANT ALL ON public.purchase_codes TO service_role;

ALTER TABLE public.purchase_codes ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "purchase_codes_admin_all" ON public.purchase_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can read only unused codes (needed to validate during signup before auth)
CREATE POLICY "purchase_codes_validate_unused" ON public.purchase_codes
  FOR SELECT TO anon, authenticated
  USING (used_at IS NULL);

CREATE INDEX idx_purchase_codes_code ON public.purchase_codes(code);
