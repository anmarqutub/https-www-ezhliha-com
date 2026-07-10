
-- 1) Providers: logo + video thumbnail
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS video_thumbnail_url text;

-- 2) Packages table
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view packages of active providers"
  ON public.packages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.active = true)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can manage packages"
  ON public.packages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS packages_provider_id_idx ON public.packages(provider_id);

CREATE TRIGGER packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Site texts (customizable labels)
CREATE TABLE IF NOT EXISTS public.site_texts (
  key text PRIMARY KEY,
  value text NOT NULL,
  label text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_texts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_texts TO authenticated;
GRANT ALL ON public.site_texts TO service_role;

ALTER TABLE public.site_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site texts"
  ON public.site_texts FOR SELECT USING (true);

CREATE POLICY "Admins can manage site texts"
  ON public.site_texts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_texts_updated_at
  BEFORE UPDATE ON public.site_texts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed defaults
INSERT INTO public.site_texts(key, value, label) VALUES
  ('video_section_title', 'فيديو تعريفي', 'عنوان قسم الفيديو في صفحة المزود'),
  ('watch_video_label', 'مشاهدة الفيديو', 'زر تشغيل الفيديو'),
  ('contact_whatsapp_label', 'تواصل واتساب', 'زر واتساب في صفحة المزود'),
  ('map_label', 'الموقع على الخريطة', 'زر الخريطة'),
  ('add_favorite_label', 'أضف للمفضلة', 'زر إضافة للمفضلة'),
  ('in_favorites_label', 'في المفضلة', 'زر عندما يكون في المفضلة'),
  ('share_label', 'مشاركة', 'زر المشاركة'),
  ('packages_title', 'الباقات والأسعار', 'عنوان قسم الباقات'),
  ('reviews_title', 'التقييمات والتعليقات', 'عنوان قسم التقييمات'),
  ('write_review_placeholder', 'اكتب تعليقك...', 'حقل كتابة التقييم'),
  ('submit_review_label', 'أرسل التقييم', 'زر إرسال التقييم'),
  ('share_wa_message', 'ياهلا ، وصلتك توصية خاصة من إزهليها لمشاهدة التفاصيل زر الموقع الحين', 'رسالة المشاركة عبر واتساب'),
  ('contact_wa_message', 'اهلا ازهليها ، عندي استفسار 😎🤍', 'رسالة التواصل معنا عبر واتساب'),
  ('footer_tagline', 'دليلك الموثوق للمناسبات', 'شعار الفوتر')
ON CONFLICT (key) DO NOTHING;

-- 4) Reviews: allow admin-added reviews with custom name
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS custom_reviewer_name text;

ALTER TABLE public.reviews
  ALTER COLUMN user_id DROP NOT NULL;

-- Update rpc to prefer custom name
CREATE OR REPLACE FUNCTION public.get_provider_reviews(p_provider_id uuid)
 RETURNS TABLE(id uuid, rating integer, comment text, created_at timestamp with time zone, reviewer_name text, is_mine boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.rating, r.comment, r.created_at,
         COALESCE(r.custom_reviewer_name, p.full_name, 'مستخدم') AS reviewer_name,
         (auth.uid() IS NOT NULL AND auth.uid() = r.user_id) AS is_mine
  FROM public.reviews r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.provider_id = p_provider_id
  ORDER BY r.created_at DESC;
$function$;

-- Admin insert policy for reviews
DROP POLICY IF EXISTS "Admins can insert any review" ON public.reviews;
CREATE POLICY "Admins can insert any review"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
