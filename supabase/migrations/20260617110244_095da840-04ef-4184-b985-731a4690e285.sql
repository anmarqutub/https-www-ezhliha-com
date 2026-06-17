
DROP POLICY IF EXISTS reviews_auth_read ON public.reviews;
CREATE POLICY reviews_own_read ON public.reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_provider_reviews(p_provider_id uuid)
RETURNS TABLE (
  id uuid,
  rating int,
  comment text,
  created_at timestamptz,
  reviewer_name text,
  is_mine boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.rating, r.comment, r.created_at,
         COALESCE(p.full_name, 'مستخدم') AS reviewer_name,
         (auth.uid() = r.user_id) AS is_mine
  FROM public.reviews r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.provider_id = p_provider_id
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_provider_reviews(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_provider_reviews(uuid) TO authenticated;
