
-- Faturas: remover INSERT/UPDATE dos clientes (somente service_role muta)
DROP POLICY IF EXISTS "faturas_insert_own" ON public.faturas;
DROP POLICY IF EXISTS "faturas_update_own" ON public.faturas;
REVOKE INSERT, UPDATE ON public.faturas FROM authenticated, anon;

-- Historico de acessos: remover INSERT do cliente (somente service_role registra)
DROP POLICY IF EXISTS "hist_acesso_insert_own" ON public.historico_acessos;
REVOKE INSERT ON public.historico_acessos FROM authenticated, anon;

-- Tickets: substituir UPDATE livre por função dedicada de fechar
DROP POLICY IF EXISTS "tickets_update_own" ON public.tickets;
REVOKE UPDATE ON public.tickets FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.fechar_ticket(_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tickets
  SET status = 'fechado',
      closed_at = now(),
      updated_at = now()
  WHERE id = _ticket_id
    AND cliente_id = auth.uid()
    AND status <> 'fechado';
END;
$$;

REVOKE ALL ON FUNCTION public.fechar_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fechar_ticket(uuid) TO authenticated;
