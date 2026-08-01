DROP POLICY IF EXISTS "critiques_public_insert" ON public.critiques;

CREATE POLICY "critiques_anonymous_insert" ON public.critiques
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    anonymous = true
    AND fid IS NULL
    AND username IS NULL
    AND char_length(discovery_id) BETWEEN 1 AND 120
    AND char_length(discovery_type) BETWEEN 1 AND 60
    AND char_length(discovery_title) BETWEEN 1 AND 200
    AND char_length(reason) BETWEEN 1 AND 80
    AND (comment IS NULL OR char_length(comment) <= 400)
  );