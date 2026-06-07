
ALTER TABLE public.faturas
  ADD COLUMN IF NOT EXISTS sgp_titulo_id text,
  ADD COLUMN IF NOT EXISTS link_pagamento text,
  ADD COLUMN IF NOT EXISTS sgp_raw jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS faturas_cliente_titulo_uniq
  ON public.faturas (cliente_id, sgp_titulo_id)
  WHERE sgp_titulo_id IS NOT NULL;

-- Remover faturas mock (sem vínculo com SGP) dos clientes já sincronizados,
-- assim a próxima sincronização traz os dados corretos do provedor.
DELETE FROM public.faturas f
USING public.profiles p
WHERE f.cliente_id = p.id
  AND p.sgp_contrato_id IS NOT NULL
  AND f.sgp_titulo_id IS NULL;
