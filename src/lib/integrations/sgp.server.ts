import QRCode from "qrcode";

// Server-only SGP (Sistema de Gestão de Provedores) client.
// Docs: https://sgp.tsmx.com.br/integracao/

export type SgpContrato = {
  contratoId: number | string;
  clienteId?: number | string;
  razaoSocial?: string;
  contratoStatus?: number | string;
  contratoStatusDisplay?: string;
  planointernet?: string;
  servico_plano?: string;
  motivo_status?: string;
  endereco_logradouro?: string;
  endereco_numero?: number | string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_uf?: string;
  endereco_cep?: string;
  cpfCnpj?: string;
  telefones?: string[];
  emails?: string[];
  [k: string]: unknown;
};

export type SgpConsultaCliente = {
  msg?: string;
  contratos?: SgpContrato[];
  [k: string]: unknown;
};

export type SgpTitulo = {
  // SGP retorna alguns campos em camelCase e outros em snake_case dependendo da rota.
  id?: number | string;
  titulo_id?: number | string;
  demonstrativo_id?: number | string;
  documento?: string;
  numerodocumento?: string;
  numeroDocumento?: number | string;
  valor?: number | string;
  valorCorrigido?: number | string;
  data_vencimento?: string;
  datavencimento?: string;
  dataVencimento?: string;
  data_pagamento?: string | null;
  datapagamento?: string | null;
  dataPagamento?: string | null;
  dataCancelamento?: string | null;
  status?: string;
  linhadigitavel?: string;
  linha_digitavel?: string;
  linhaDigitavel?: string;
  pix_qrcode?: string;
  pix_emv?: string;
  qrcode_pix?: string;
  qrcode?: string;
  codigoPix?: string;
  link_pagamento?: string;
  linkdoboleto?: string;
  link_boleto?: string;
  boleto_url?: string;
  link?: string;
  link_cobranca?: string;
  descricao?: string;
  demonstrativo?: string;
  [k: string]: unknown;
};

export type SgpSegundaVia = {
  msg?: string;
  titulos?: SgpTitulo[];
  demonstrativos?: SgpTitulo[];
  [k: string]: unknown;
};

function getSgpEnv() {
  const raw = process.env.SGP_BASE_URL;
  const app = process.env.SGP_APP;
  const token = process.env.SGP_TOKEN;
  if (!raw) throw new Error("SGP_BASE_URL não configurado");
  if (!app) throw new Error("SGP_APP não configurado");
  if (!token) throw new Error("SGP_TOKEN não configurado");
  let baseUrl: string;
  try {
    baseUrl = new URL(raw).origin;
  } catch {
    baseUrl = raw.replace(/\/+$/, "");
  }
  return { baseUrl, app, token };
}

async function sgpPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { baseUrl, app, token } = getSgpEnv();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token, app, ...body }),
  });
  const text = await res.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    console.error("SGP invalid response", { path, status: res.status, preview: text.slice(0, 200) });
    throw new Error("SGP_REQUEST_FAILED");
  }
  if (!res.ok) {
    const msg = (payload as { msg?: string; detail?: string })?.msg
      ?? (payload as { detail?: string })?.detail
      ?? `HTTP ${res.status}`;
    console.error("SGP request failed", { path, status: res.status, message: msg });
    throw new Error("SGP_REQUEST_FAILED");
  }
  return payload as T;
}

async function sgpPostWithFallback<T>(paths: string[], body: Record<string, unknown>): Promise<T> {
  let lastNotFoundError: Error | undefined;

  for (const path of paths) {
    try {
      return await sgpPost<T>(path, body);
    } catch (error) {
      if (error instanceof Error && /\b404\b/.test(error.message)) {
        lastNotFoundError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastNotFoundError) {
    console.error("SGP invoice endpoints not found", { triedPaths: paths });
  }
  throw new Error("SGP_REQUEST_FAILED");
}

export function onlyDigits(s: string) {
  return (s ?? "").replace(/\D+/g, "");
}

export function sgpConsultaCliente(cpfcnpj: string) {
  return sgpPost<SgpConsultaCliente>("/api/ura/consultacliente/", {
    cpfcnpj: onlyDigits(cpfcnpj),
  });
}

/** Lista títulos/faturas do cliente usando a rota atual do SGP e fallback legado. */
export function sgpSegundaVia(args: { cpfcnpj?: string; contrato?: string | number }) {
  const body: Record<string, unknown> = {};
  if (args.cpfcnpj) body.cpfcnpj = onlyDigits(args.cpfcnpj);
  if (args.contrato) body.contrato = args.contrato;
  return sgpPostWithFallback<SgpSegundaVia>([
    "/api/ura/titulos/",
    "/api/ura/fatura2via/",
    "/api/ura/segundavia/",
  ], body);
}

/** Normaliza um título do SGP para o shape da tabela `faturas`. */
export function normalizeTitulo(t: SgpTitulo) {
  const id = t.titulo_id ?? t.demonstrativo_id ?? t.numerodocumento ?? t.documento;
  const valor = Number(t.valor ?? 0);
  const dataVencimento = String(t.data_vencimento ?? t.datavencimento ?? "").slice(0, 10);
  const dataPagamentoRaw = t.data_pagamento ?? t.datapagamento ?? null;
  const dataPagamento = dataPagamentoRaw ? String(dataPagamentoRaw).slice(0, 10) : null;
  const linhaDigitavel = t.linhadigitavel ?? t.linha_digitavel ?? null;
  const pixPayload = t.pix_emv ?? t.qrcode_pix ?? t.pix_qrcode ?? t.qrcode ?? null;
  const linkPagamento = t.link_pagamento ?? t.linkdoboleto ?? t.link_boleto ?? t.boleto_url ?? null;
  const descricao = (t.descricao as string | undefined) ?? "Mensalidade";
  return {
    sgp_titulo_id: id != null ? String(id) : null,
    valor,
    data_vencimento: dataVencimento,
    data_pagamento: dataPagamento,
    status: dataPagamento ? "pago" : "aberto",
    descricao,
    linha_digitavel: linhaDigitavel,
    pix_payload: pixPayload,
    pix_qrcode: pixPayload
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`
      : null,
    link_pagamento: linkPagamento,
  };
}

export async function buildPixQrCodeDataUrl(pixPayload: string) {
  return QRCode.toDataURL(pixPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 300,
  });
}
