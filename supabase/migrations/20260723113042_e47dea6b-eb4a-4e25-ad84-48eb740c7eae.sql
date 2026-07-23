
DROP POLICY IF EXISTS "Anyone can view packages of active providers" ON public.packages;
DROP POLICY IF EXISTS "Anyone can view services of active providers" ON public.services;
DROP POLICY IF EXISTS "Anyone can view branches of active providers" ON public.branches;

CREATE POLICY "Public can view packages of active providers" ON public.packages
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = packages.provider_id AND p.active = true));

CREATE POLICY "Admins can view all packages" ON public.packages
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view services of active providers" ON public.services
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = services.provider_id AND p.active = true));

CREATE POLICY "Admins can view all services" ON public.services
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view branches of active providers" ON public.branches
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = branches.provider_id AND p.active = true));

CREATE POLICY "Admins can view all branches" ON public.branches
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
