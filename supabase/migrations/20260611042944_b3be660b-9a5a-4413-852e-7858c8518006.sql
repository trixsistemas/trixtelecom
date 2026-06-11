
REVOKE DELETE ON public.faturas FROM authenticated, anon;
REVOKE DELETE ON public.historico_acessos FROM authenticated, anon;
REVOKE DELETE ON public.tickets FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.ticket_mensagens FROM authenticated, anon;

CREATE POLICY "faturas_no_delete" ON public.faturas FOR DELETE TO authenticated USING (false);
CREATE POLICY "historico_acessos_no_delete" ON public.historico_acessos FOR DELETE TO authenticated USING (false);
CREATE POLICY "tickets_no_delete" ON public.tickets FOR DELETE TO authenticated USING (false);
CREATE POLICY "ticket_mensagens_no_update" ON public.ticket_mensagens FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "ticket_mensagens_no_delete" ON public.ticket_mensagens FOR DELETE TO authenticated USING (false);
