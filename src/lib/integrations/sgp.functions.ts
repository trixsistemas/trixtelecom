import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sgpConsultaCliente, onlyDigits } from "./sgp.server";

/**
 * Valida se um CPF/CNPJ existe no SGP — chamado no cadastro,
 * sem auth, para impedir conta de quem não é cliente.
 * Retorna apenas o mínimo necessário (sem dados sensíveis).
 */
export const validarClienteSgp = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      cpf_cnpj: z.string().min(11).max(20),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const doc = onlyDigits(data.cpf_cnpj);
    if (doc.length !== 11 && doc.length !== 14) {
      return { found: false as const, reason: "CPF/CNPJ inválido" };
    }
    try {
      const r = await sgpConsultaCliente(doc);
      const contrato = r.contratos?.[0];
      if (!contrato) {
        return { found: false as const, reason: "Documento não localizado no sistema do provedor" };
      }
      return {
        found: true as const,
        nome: String(contrato.razaoSocial ?? ""),
        status: String(contrato.statusDisplay ?? contrato.status ?? ""),
      };
    } catch (err) {
      console.error("validarClienteSgp", err);
      return { found: false as const, reason: "Não foi possível consultar o SGP agora" };
    }
  });

/**
 * Sincroniza o perfil do usuário logado com o SGP, gravando
 * cliente_id, contrato_id, status e o JSON bruto pra auditoria.
 */
export const sincronizarMeuPerfilSgp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("cpf_cnpj")
      .eq("id", userId)
      .single();
    if (profileErr) throw new Error(profileErr.message);
    if (!profile?.cpf_cnpj) throw new Error("Cadastre seu CPF/CNPJ no perfil antes de sincronizar.");

    const r = await sgpConsultaCliente(profile.cpf_cnpj);
    const contrato = r.contratos?.[0];
    if (!contrato) throw new Error("Cliente não encontrado no SGP.");

    const update = {
      erp: "sgp",
      sgp_cliente_id: String(contrato.contrato ?? ""),
      sgp_contrato_id: String(contrato.contrato ?? ""),
      sgp_status: String(contrato.statusDisplay ?? contrato.status ?? ""),
      sgp_raw: r as unknown as Record<string, unknown>,
      sgp_synced_at: new Date().toISOString(),
      plano: contrato.planoInternet ? String(contrato.planoInternet) : undefined,
      nome: contrato.razaoSocial ? String(contrato.razaoSocial) : undefined,
    };
    // remove undefined to não sobrescrever
    const clean = Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined));

    const { error: updErr } = await supabase.from("profiles").update(clean).eq("id", userId);
    if (updErr) throw new Error(updErr.message);

    return {
      ok: true as const,
      contrato: update.sgp_contrato_id,
      status: update.sgp_status,
      plano: update.plano ?? null,
    };
  });
