
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

CREATE TABLE IF NOT EXISTS public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip text,
  user_agent text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  hit_count integer NOT NULL DEFAULT 1,
  UNIQUE (user_id, ip)
);

CREATE INDEX IF NOT EXISTS login_events_user_idx ON public.login_events(user_id, last_seen_at DESC);

GRANT SELECT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read login events"
  ON public.login_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
