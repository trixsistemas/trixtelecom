CREATE TABLE public.signup_lookup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  document_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.signup_lookup_attempts TO service_role;
ALTER TABLE public.signup_lookup_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX signup_lookup_attempts_ip_created_at_idx
  ON public.signup_lookup_attempts (ip_hash, created_at DESC);
CREATE INDEX signup_lookup_attempts_document_created_at_idx
  ON public.signup_lookup_attempts (document_hash, created_at DESC);