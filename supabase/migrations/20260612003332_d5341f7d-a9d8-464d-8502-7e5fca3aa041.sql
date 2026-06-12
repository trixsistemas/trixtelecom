REVOKE EXECUTE ON FUNCTION public.fechar_ticket(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fechar_ticket(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.fechar_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fechar_ticket(uuid) TO service_role;