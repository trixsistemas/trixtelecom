import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "crypto";
import { getRequest } from "@tanstack/react-start/server";
import { sgpConsultaCliente, onlyDigits } from "./integrations/sgp.server";

const LOOKUP_WINDOW_MINUTES = 10;
const LOOKUP_MAX_ATTEMPTS_PER_IP = 20;

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function getRequestIp() {
  const request = getRequest();
  return (
    request?.headers.get("cf-connecting-ip") ??
    request?.headers.get("x-forwarded-for")?.split(",")[0] ??
    request?.headers.get("x-real-ip") ??
    "unknown"
  ).trim();
}

function cpfEmail(doc: string) {
  return `${doc}@cliente.trixtelecom.app`;
}

/**
 * Login apenas com CPF/CNPJ do titular.
 * Valida o documento no SGP, garante que existe um usuário correspondente
 * e devolve um token de sessão de uso único (magic link) para o cliente.
 */
export const entrarComCpf = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ cpf_cnpj: z.string().min(11).max(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const doc = onlyDigits(data.cpf_cnpj);
    if (doc.length !== 11 && doc.length !== 14) {
      return { ok: false as const, reason: "CPF inválido. Digite os 11 números." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Limite de tentativas por IP
    const ipHash = sha256(getRequestIp());
    const windowStart = new Date(Date.now() - LOOKUP_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("signup_lookup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart);
    if ((count ?? 0) >= LOOKUP_MAX_ATTEMPTS_PER_IP) {
      return { ok: false as const, reason: "Muitas tentativas. Aguarde alguns minutos." };
    }
    await supabaseAdmin
      .from("signup_lookup_attempts")
      .insert({ ip_hash: ipHash, document_hash: sha256(doc) });

    // Valida no SGP
    let contrato;
    try {
      const r = await sgpConsultaCliente(doc);
      contrato = r.contratos?.[0];
    } catch (error) {
      console.error("entrarComCpf/sgp", error);
      return { ok: false as const, reason: "Não foi possível consultar o sistema agora. Tente novamente." };
    }
    if (!contrato) {
      return { ok: false as const, reason: "CPF não localizado. Confira o CPF do titular da assinatura." };
    }

    const nome = String(contrato.razaoSocial ?? "Cliente");

    // Reaproveita a conta existente deste CPF, se houver
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("cpf_cnpj", doc)
      .maybeSingle();

    let email = cpfEmail(doc);

    if (existing?.id) {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(existing.id);
      if (userRes?.user?.email) email = userRes.user.email;
    } else {
      const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          nome,
          cpf_cnpj: doc,
          telefone: Array.isArray(contrato.telefones) ? String(contrato.telefones[0] ?? "") : "",
        },
      });
      if (createErr && !/already/i.test(createErr.message)) {
        console.error("entrarComCpf/createUser", createErr);
        return { ok: false as const, reason: "Não foi possível iniciar sua sessão. Tente novamente." };
      }
    }

    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      console.error("entrarComCpf/generateLink", linkErr);
      return { ok: false as const, reason: "Não foi possível iniciar sua sessão. Tente novamente." };
    }

    return { ok: true as const, token_hash: link.properties.hashed_token, nome };
  });
