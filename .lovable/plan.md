## TRIX ISP — Portal do Cliente (Web)

Recriação do projeto original (React Native + Node + MySQL) como **web app mobile-first** usando o stack disponível: TanStack Start (React) + Lovable Cloud (Postgres/Auth) no lugar de Express/MySQL.

### Stack e equivalências
| Original | Aqui |
|---|---|
| API Node/Express | `createServerFn` (TanStack Start) |
| MySQL | Postgres (Lovable Cloud) |
| Login CPF + senha | Lovable Cloud Auth (email/senha) + campo CPF no profile |
| IXC / SGP / Asaas | **Mocks** prontos para trocar por API real depois |
| Expo App | Web responsivo PWA-ready |

### Módulos da v1
1. **Auth** — cadastro/login email+senha, profile com CPF/CNPJ, nome, telefone
2. **Home / Dashboard** — saudação, status da conexão (ativo/bloqueado), resumo de fatura aberta, atalhos
3. **Financeiro** — lista de faturas (aberto/pago/vencido), gerar 2ª via (PIX/Boleto mockados), histórico
4. **Suporte** — abrir ticket, listar, ver detalhes, responder (mensagens)
5. **Teste de velocidade** — medição real no navegador (download/upload/latência), salvar histórico, gráficos
6. **Perfil** — dados pessoais, logout, histórico de acessos

### Modelo de dados (Postgres / RLS por `auth.uid()`)
- `profiles` (id=auth.users, nome, cpf_cnpj, telefone, status, erp)
- `faturas` (cliente_id, valor, vencimento, status, descricao, pix_payload, boleto_url)
- `tickets` (cliente_id, titulo, descricao, categoria, prioridade, status)
- `ticket_mensagens` (ticket_id, autor_tipo, mensagem)
- `teste_velocidade` (cliente_id, download_mbps, upload_mbps, latencia_ms, jitter_ms)
- `historico_acessos` (cliente_id, tipo, descricao, user_agent)
- `historico_bloqueios` (cliente_id, tipo_acao, motivo)

Todas com RLS: cliente só vê/edita os próprios dados. Faturas/tickets têm seed automático no primeiro login para o usuário ver dados de exemplo.

### Rotas
- `/login`, `/signup`
- `/_authenticated/` (layout protegido)
  - `/` dashboard
  - `/financeiro`, `/financeiro/$faturaId`
  - `/suporte`, `/suporte/novo`, `/suporte/$ticketId`
  - `/velocidade`
  - `/perfil`

### Design
Visual moderno mobile-first inspirado em apps de telecom brasileiros (Vivo/Claro/TIM):
- Paleta: azul profundo + ciano elétrico (sensação de "fibra/velocidade") + neutros
- Tipografia: Sora (display) + Inter (body)
- Bottom navigation no mobile, sidebar no desktop
- Cards com gradiente sutil, status pills coloridas

### Integrações externas
Asaas/IXC/SGP ficam como **serviços mock** isolados em `src/lib/integrations/*.functions.ts` — interface pronta pra plugar API real trocando só o handler.

### Fora do escopo da v1
- Webhook Asaas real (precisa secret/conta) — mock processa "pagamento" via botão
- Job cron de verificação de bloqueio — substituído por cálculo on-demand (data_vencimento + dias de tolerância)
- App nativo / push notifications
- Painel admin do provedor (só portal cliente)
