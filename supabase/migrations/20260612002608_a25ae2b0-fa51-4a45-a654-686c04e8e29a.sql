
-- Profiles
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Tickets (UPDATE intencionalmente fora; usa RPC fechar_ticket)
GRANT SELECT, INSERT ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

-- Ticket mensagens
GRANT SELECT, INSERT ON public.ticket_mensagens TO authenticated;
GRANT ALL ON public.ticket_mensagens TO service_role;

-- Faturas (somente leitura ao cliente; mutações via service_role)
GRANT SELECT ON public.faturas TO authenticated;
GRANT ALL ON public.faturas TO service_role;

-- Histórico de acessos (somente leitura ao cliente)
GRANT SELECT ON public.historico_acessos TO authenticated;
GRANT ALL ON public.historico_acessos TO service_role;

-- Histórico de bloqueios
GRANT SELECT ON public.historico_bloqueios TO authenticated;
GRANT ALL ON public.historico_bloqueios TO service_role;

-- Teste de velocidade
GRANT SELECT, INSERT ON public.teste_velocidade TO authenticated;
GRANT ALL ON public.teste_velocidade TO service_role;
