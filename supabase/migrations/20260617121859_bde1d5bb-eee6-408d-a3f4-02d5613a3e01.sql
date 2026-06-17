
CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_sid text NOT NULL,
  user_agent text,
  ip text,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_sid)
);

CREATE INDEX IF NOT EXISTS user_devices_user_idx ON public.user_devices(user_id, last_seen_at DESC);

GRANT SELECT ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all devices"
  ON public.user_devices FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read their own devices"
  ON public.user_devices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
