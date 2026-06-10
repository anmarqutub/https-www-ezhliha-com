-- Create the public storage bucket used for provider images.

INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-images', 'provider-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
CREATE POLICY "Public read provider-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'provider-images');

-- Authenticated users can upload
CREATE POLICY "Authenticated upload provider-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'provider-images');

-- Authenticated users can update/delete their own files
CREATE POLICY "Authenticated update provider-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'provider-images');

CREATE POLICY "Authenticated delete provider-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'provider-images');
