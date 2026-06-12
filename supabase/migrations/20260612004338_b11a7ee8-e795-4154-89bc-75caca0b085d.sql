CREATE POLICY signup_lookup_attempts_service_role_only
ON public.signup_lookup_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);