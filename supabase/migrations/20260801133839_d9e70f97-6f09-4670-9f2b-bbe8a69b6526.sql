DROP POLICY IF EXISTS "critiques_no_direct_access" ON public.critiques;

GRANT SELECT, INSERT ON public.critiques TO anon, authenticated;

CREATE POLICY "critiques_public_read" ON public.critiques
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "critiques_public_insert" ON public.critiques
  FOR INSERT TO anon, authenticated WITH CHECK (true);