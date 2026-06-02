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

function getSgpEnv() {
  const baseUrl = process.env.SGP_BASE_URL?.replace(/\/+$/, "");
  const app = process.env.SGP_APP;
  const token = process.env.SGP_TOKEN;
  if (!baseUrl) throw new Error("SGP_BASE_URL não configurado");
  if (!app) throw new Error("SGP_APP não configurado");
  if (!token) throw new Error("SGP_TOKEN não configurado");
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
    throw new Error(`SGP ${path}: resposta inválida (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = (payload as { msg?: string; detail?: string })?.msg
      ?? (payload as { detail?: string })?.detail
      ?? `HTTP ${res.status}`;
    throw new Error(`SGP ${path}: ${msg}`);
  }
  return payload as T;
}

/** Limpa caracteres não numéricos do CPF/CNPJ. */
export function onlyDigits(s: string) {
  return (s ?? "").replace(/\D+/g, "");
}

/** Consulta cliente pelo CPF/CNPJ. */
export function sgpConsultaCliente(cpfcnpj: string) {
  return sgpPost<SgpConsultaCliente>("/api/ura/consultacliente/", {
    cpfcnpj: onlyDigits(cpfcnpj),
  });
}
