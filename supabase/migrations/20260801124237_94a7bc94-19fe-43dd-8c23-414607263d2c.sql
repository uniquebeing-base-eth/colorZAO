CREATE TABLE public.painters (
  fid BIGINT PRIMARY KEY,
  username TEXT,
  display_name TEXT,
  pfp_url TEXT,
  wallet_address TEXT,
  terms_signature TEXT,
  terms_signed_at TIMESTAMPTZ,
  canvases_painted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.painters TO service_role;
ALTER TABLE public.painters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "painters_no_direct_access" ON public.painters FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.critiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_id TEXT NOT NULL,
  discovery_type TEXT NOT NULL,
  discovery_title TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('smash','pass')),
  reason TEXT NOT NULL,
  comment TEXT,
  anonymous BOOLEAN NOT NULL DEFAULT true,
  fid BIGINT,
  username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX critiques_discovery_id_idx ON public.critiques (discovery_id, created_at DESC);
CREATE INDEX critiques_created_at_idx ON public.critiques (created_at DESC);

GRANT ALL ON public.critiques TO service_role;
ALTER TABLE public.critiques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "critiques_no_direct_access" ON public.critiques FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.notification_tokens (
  fid BIGINT PRIMARY KEY,
  token TEXT NOT NULL,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.notification_tokens TO service_role;
ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_tokens_no_direct_access" ON public.notification_tokens FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER painters_touch_updated_at BEFORE UPDATE ON public.painters
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER notification_tokens_touch_updated_at BEFORE UPDATE ON public.notification_tokens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();