import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sgpConsultaCliente, onlyDigits } from "./sgp.server";

/**
 * Valida se um CPF/CNPJ existe no SGP — chamado no cadastro,
 * sem auth, para impedir conta de quem não é cliente.
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
        status: String(contrato.contratoStatusDisplay ?? contrato.contratoStatus ?? ""),
      };
    } catch (err) {
      console.error("validarClienteSgp", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido ao consultar o SGP";
      return { found: false as const, reason: msg };
    }
  });

/**
 * Sincroniza o perfil do usuário logado com o SGP.
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

    const sgpContratoId = String(contrato.contratoId ?? "");
    const sgpClienteId = String(contrato.clienteId ?? sgpContratoId);
    const sgpStatus = String(contrato.contratoStatusDisplay ?? contrato.contratoStatus ?? "");
    const plano = contrato.planointernet ?? contrato.servico_plano;

    const update: Record<string, unknown> = {
      erp: "sgp",
      sgp_cliente_id: sgpClienteId,
      sgp_contrato_id: sgpContratoId,
      sgp_status: sgpStatus,
      sgp_raw: r as unknown as Record<string, unknown>,
      sgp_synced_at: new Date().toISOString(),
    };
    if (plano) update.plano = String(plano);
    if (contrato.razaoSocial) update.nome = String(contrato.razaoSocial);

    const { error: updErr } = await supabase
      .from("profiles")
      .update(update as never)
      .eq("id", userId);
    if (updErr) throw new Error(updErr.message);

    return {
      ok: true as const,
      contrato: sgpContratoId,
      status: sgpStatus,
      plano: (update.plano as string | undefined) ?? null,
    };
  });
