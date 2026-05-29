
-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  cpf_cnpj TEXT,
  telefone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'ativo', -- ativo, bloqueado, suspenso
  erp TEXT NOT NULL DEFAULT 'mock',
  plano TEXT DEFAULT 'Fibra 500MB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- =========================================================
-- FATURAS
-- =========================================================
CREATE TABLE public.faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'aberto', -- aberto, pago, vencido
  descricao TEXT,
  pix_payload TEXT,
  pix_qrcode TEXT,
  boleto_url TEXT,
  linha_digitavel TEXT,
  metodo_pagamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_faturas_cliente ON public.faturas(cliente_id);
CREATE INDEX idx_faturas_status ON public.faturas(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faturas TO authenticated;
GRANT ALL ON public.faturas TO service_role;

ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faturas_select_own" ON public.faturas FOR SELECT TO authenticated USING (auth.uid() = cliente_id);
CREATE POLICY "faturas_insert_own" ON public.faturas FOR INSERT TO authenticated WITH CHECK (auth.uid() = cliente_id);
CREATE POLICY "faturas_update_own" ON public.faturas FOR UPDATE TO authenticated USING (auth.uid() = cliente_id);

-- =========================================================
-- TICKETS
-- =========================================================
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'tecnico', -- tecnico, financeiro, comercial, outros
  prioridade TEXT NOT NULL DEFAULT 'normal', -- baixa, normal, alta, urgente
  status TEXT NOT NULL DEFAULT 'aberto', -- aberto, em_andamento, fechado
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_tickets_cliente ON public.tickets(cliente_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_select_own" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = cliente_id);
CREATE POLICY "tickets_insert_own" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = cliente_id);
CREATE POLICY "tickets_update_own" ON public.tickets FOR UPDATE TO authenticated USING (auth.uid() = cliente_id);

-- =========================================================
-- TICKET MENSAGENS
-- =========================================================
CREATE TABLE public.ticket_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  autor_tipo TEXT NOT NULL DEFAULT 'cliente', -- cliente, suporte
  autor_nome TEXT,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_msg_ticket ON public.ticket_mensagens(ticket_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_mensagens TO authenticated;
GRANT ALL ON public.ticket_mensagens TO service_role;

ALTER TABLE public.ticket_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_select_own" ON public.ticket_mensagens FOR SELECT TO authenticated USING (auth.uid() = cliente_id);
CREATE POLICY "msg_insert_own" ON public.ticket_mensagens FOR INSERT TO authenticated WITH CHECK (auth.uid() = cliente_id);

-- =========================================================
-- TESTE VELOCIDADE
-- =========================================================
CREATE TABLE public.teste_velocidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  download_mbps NUMERIC(10,2),
  upload_mbps NUMERIC(10,2),
  latencia_ms NUMERIC(10,2),
  jitter_ms NUMERIC(10,2),
  servidor_teste TEXT,
  ip_cliente TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teste_cliente ON public.teste_velocidade(cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teste_velocidade TO authenticated;
GRANT ALL ON public.teste_velocidade TO service_role;

ALTER TABLE public.teste_velocidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teste_select_own" ON public.teste_velocidade FOR SELECT TO authenticated USING (auth.uid() = cliente_id);
CREATE POLICY "teste_insert_own" ON public.teste_velocidade FOR INSERT TO authenticated WITH CHECK (auth.uid() = cliente_id);

-- =========================================================
-- HISTORICO ACESSOS
-- =========================================================
CREATE TABLE public.historico_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo_acesso TEXT,
  descricao TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hist_acesso_cliente ON public.historico_acessos(cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_acessos TO authenticated;
GRANT ALL ON public.historico_acessos TO service_role;

ALTER TABLE public.historico_acessos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hist_acesso_select_own" ON public.historico_acessos FOR SELECT TO authenticated USING (auth.uid() = cliente_id);
CREATE POLICY "hist_acesso_insert_own" ON public.historico_acessos FOR INSERT TO authenticated WITH CHECK (auth.uid() = cliente_id);

-- =========================================================
-- HISTORICO BLOQUEIOS
-- =========================================================
CREATE TABLE public.historico_bloqueios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo_acao TEXT,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hist_bloq_cliente ON public.historico_bloqueios(cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_bloqueios TO authenticated;
GRANT ALL ON public.historico_bloqueios TO service_role;

ALTER TABLE public.historico_bloqueios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hist_bloq_select_own" ON public.historico_bloqueios FOR SELECT TO authenticated USING (auth.uid() = cliente_id);

-- =========================================================
-- updated_at trigger function
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_faturas_updated BEFORE UPDATE ON public.faturas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- handle_new_user: auto-create profile + seed demo data
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, cpf_cnpj, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'cpf_cnpj',
    NEW.raw_user_meta_data->>'telefone'
  );

  -- Seed: 1 fatura aberta, 1 fatura paga
  INSERT INTO public.faturas (cliente_id, valor, data_vencimento, status, descricao)
  VALUES
    (NEW.id, 99.90, CURRENT_DATE + INTERVAL '7 days', 'aberto', 'Mensalidade Fibra 500MB'),
    (NEW.id, 99.90, CURRENT_DATE - INTERVAL '23 days', 'pago', 'Mensalidade Fibra 500MB');

  UPDATE public.faturas SET data_pagamento = CURRENT_DATE - INTERVAL '20 days'
  WHERE cliente_id = NEW.id AND status = 'pago';

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
