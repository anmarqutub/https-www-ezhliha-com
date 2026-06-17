ALTER TABLE public.purchase_codes
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS salla_order_id text;
CREATE INDEX IF NOT EXISTS idx_purchase_codes_salla_order ON public.purchase_codes(salla_order_id);