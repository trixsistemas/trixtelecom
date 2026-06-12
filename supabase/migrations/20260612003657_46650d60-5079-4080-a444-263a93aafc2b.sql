REVOKE UPDATE ON public.profiles FROM authenticated, anon;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

DROP POLICY IF EXISTS msg_insert_own ON public.ticket_mensagens;
CREATE POLICY msg_insert_own
ON public.ticket_mensagens
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = cliente_id
  AND autor_tipo = 'cliente'
  AND COALESCE(BTRIM(autor_nome), '') = ''
  AND EXISTS (
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_id
      AND t.cliente_id = auth.uid()
  )
);