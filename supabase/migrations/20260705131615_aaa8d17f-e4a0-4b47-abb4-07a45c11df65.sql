
-- Rewrite public read policies to remove has_role for anon; add separate admin read policy
DROP POLICY IF EXISTS cities_public_read ON public.cities;
CREATE POLICY cities_public_read ON public.cities FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY cities_admin_read ON public.cities FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY categories_admin_read ON public.categories FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS subcategories_public_read ON public.subcategories;
CREATE POLICY subcategories_public_read ON public.subcategories FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY subcategories_admin_read ON public.subcategories FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS providers_public_read ON public.providers;
CREATE POLICY providers_public_read ON public.providers FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY providers_admin_read ON public.providers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS banners_public_read ON public.banners;
CREATE POLICY banners_public_read ON public.banners FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY banners_admin_read ON public.banners FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Revoke anon execute on has_role (now only used by authenticated policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;

-- Set search_path on email queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
