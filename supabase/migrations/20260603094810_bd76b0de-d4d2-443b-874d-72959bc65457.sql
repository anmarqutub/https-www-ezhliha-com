-- 1) Stop exposing unused purchase codes to anon/auth clients
DROP POLICY IF EXISTS purchase_codes_validate_unused ON public.purchase_codes;

-- 2) Limit reviews read to authenticated users (avoids anon enumeration of user_id)
DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_auth_read
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (true);

-- 3) Drop broad listing policy on provider-images bucket; public file URLs still resolve via CDN
DROP POLICY IF EXISTS provider_images_bucket_public_read ON storage.objects;

CREATE POLICY provider_images_bucket_admin_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'provider-images' AND has_role(auth.uid(), 'admin'::app_role));