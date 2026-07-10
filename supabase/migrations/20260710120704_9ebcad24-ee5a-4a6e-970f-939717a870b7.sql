ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS contact_phone text;

COMMENT ON COLUMN public.providers.contact_phone IS 'Optional direct contact phone number, separate from WhatsApp number.';