-- Cities
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Subcategories
CREATE TABLE public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Providers
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  price_from numeric(10,2),
  price_to numeric(10,2),
  whatsapp text,
  instagram text,
  address text,
  rating numeric(2,1) DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  featured_until timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_providers_sub ON public.providers(subcategory_id);
CREATE INDEX idx_providers_city ON public.providers(city_id);

-- Provider Images
CREATE TABLE public.provider_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_provider_images_provider ON public.provider_images(provider_id);

-- Triggers for updated_at
CREATE TRIGGER trg_cities_updated BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_subcategories_updated BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_providers_updated BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS: public read of active rows; admin full CRUD
-- Cities
CREATE POLICY "cities_public_read" ON public.cities FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cities_admin_all" ON public.cities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Categories
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Subcategories
CREATE POLICY "subcategories_public_read" ON public.subcategories FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "subcategories_admin_all" ON public.subcategories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Providers
CREATE POLICY "providers_public_read" ON public.providers FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "providers_admin_all" ON public.providers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Provider images
CREATE POLICY "provider_images_public_read" ON public.provider_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "provider_images_admin_all" ON public.provider_images FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for provider images
INSERT INTO storage.buckets (id, name, public) VALUES ('provider-images', 'provider-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "provider_images_bucket_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'provider-images');
CREATE POLICY "provider_images_bucket_admin_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'provider-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "provider_images_bucket_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'provider-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "provider_images_bucket_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'provider-images' AND public.has_role(auth.uid(), 'admin'));

-- Seed cities
INSERT INTO public.cities (name_ar, name_en, slug, sort_order) VALUES
  ('الرياض', 'Riyadh', 'riyadh', 1),
  ('جدة', 'Jeddah', 'jeddah', 2),
  ('مكة المكرمة', 'Makkah', 'makkah', 3),
  ('الدمام', 'Dammam', 'dammam', 4),
  ('الطائف', 'Taif', 'taif', 5);

-- Seed example category
INSERT INTO public.categories (name_ar, name_en, slug, icon, sort_order) VALUES
  ('صوالين تجميل', 'Beauty Salons', 'salons', '💇‍♀️', 1),
  ('مصورات', 'Photographers', 'photographers', '📸', 2),
  ('قاعات أفراح', 'Wedding Halls', 'halls', '🏛️', 3);

INSERT INTO public.subcategories (category_id, name_ar, name_en, slug, sort_order)
SELECT id, 'مكياج', 'Makeup', 'makeup', 1 FROM public.categories WHERE slug = 'salons'
UNION ALL
SELECT id, 'شعر', 'Hair', 'hair', 2 FROM public.categories WHERE slug = 'salons'
UNION ALL
SELECT id, 'حناء', 'Henna', 'henna', 3 FROM public.categories WHERE slug = 'salons'
UNION ALL
SELECT id, 'تصوير أعراس', 'Wedding Photography', 'wedding-photo', 1 FROM public.categories WHERE slug = 'photographers'
UNION ALL
SELECT id, 'تصوير مناسبات', 'Event Photography', 'event-photo', 2 FROM public.categories WHERE slug = 'photographers';