CREATE POLICY profiles_no_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY tickets_no_update
ON public.tickets
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY historico_bloqueios_no_delete
ON public.historico_bloqueios
FOR DELETE
TO authenticated
USING (false);