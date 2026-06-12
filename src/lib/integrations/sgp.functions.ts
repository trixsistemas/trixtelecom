import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sgpConsultaCliente, sgpSegundaVia, normalizeTitulo, onlyDigits } from "./sgp.server";

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
      };
    } catch (err) {
      console.error("validarClienteSgp", err);
      return { found: false as const, reason: "Não foi possível verificar o documento no sistema do provedor." };
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

    let r;
    try {
      r = await sgpConsultaCliente(profile.cpf_cnpj);
    } catch (error) {
      console.error("sincronizarMeuPerfilSgp", error);
      throw new Error("Falha ao sincronizar seus dados agora. Tente novamente em instantes.");
    }
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
      motivo_status: contrato.motivo_status ?? null,
      endereco_logradouro: contrato.endereco_logradouro ?? null,
      endereco_numero: contrato.endereco_numero != null ? String(contrato.endereco_numero) : null,
      endereco_bairro: contrato.endereco_bairro ?? null,
      endereco_cidade: contrato.endereco_cidade ?? null,
      endereco_uf: contrato.endereco_uf ?? null,
      endereco_cep: contrato.endereco_cep ?? null,
      telefones: Array.isArray(contrato.telefones) ? contrato.telefones : null,
      emails: Array.isArray(contrato.emails) ? contrato.emails : null,
    };
    if (plano) update.plano = String(plano);
    if (contrato.razaoSocial) update.nome = String(contrato.razaoSocial);
    if (Array.isArray(contrato.telefones) && contrato.telefones.length > 0) {
      update.telefone = String(contrato.telefones[0]);
    }
    if (Array.isArray(contrato.emails) && contrato.emails.length > 0) {
      update.email = String(contrato.emails[0]);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: updErr } = await supabaseAdmin
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

/**
 * Sincroniza as faturas do usuário logado com os títulos do SGP.
 * Faz upsert por (cliente_id, sgp_titulo_id).
 */
export const sincronizarMinhasFaturasSgp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("cpf_cnpj, sgp_contrato_id")
      .eq("id", userId)
      .single();
    if (pErr) throw new Error(pErr.message);
    if (!profile?.cpf_cnpj) throw new Error("Cadastre seu CPF/CNPJ no perfil antes de sincronizar.");

    let r;
    try {
      r = await sgpSegundaVia({
        cpfcnpj: profile.cpf_cnpj,
        contrato: profile.sgp_contrato_id ?? undefined,
      });
    } catch (error) {
      console.error("sincronizarMinhasFaturasSgp", error);
      throw new Error("Falha ao carregar suas faturas agora. Tente novamente em instantes.");
    }
    const titulos = (r.titulos ?? r.demonstrativos ?? []) as Parameters<typeof normalizeTitulo>[0][];

    // Mutações em faturas só podem ocorrer via service_role (RLS bloqueia cliente).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Remove faturas mock (sem sgp_titulo_id) deste cliente — agora temos dados reais.
    await supabaseAdmin
      .from("faturas")
      .delete()
      .eq("cliente_id", userId)
      .is("sgp_titulo_id", null);

    let inseridas = 0;
    let atualizadas = 0;
    for (const t of titulos) {
      const n = normalizeTitulo(t);
      if (!n.sgp_titulo_id || !n.data_vencimento) continue;
      const row = {
        cliente_id: userId,
        sgp_titulo_id: n.sgp_titulo_id,
        valor: n.valor,
        data_vencimento: n.data_vencimento,
        data_pagamento: n.data_pagamento,
        status: n.status,
        descricao: n.descricao,
        linha_digitavel: n.linha_digitavel,
        pix_payload: n.pix_payload,
        pix_qrcode: n.pix_qrcode,
        link_pagamento: n.link_pagamento,
        sgp_raw: t as unknown as Record<string, unknown>,
      };

      const { data: existing } = await supabaseAdmin
        .from("faturas")
        .select("id")
        .eq("cliente_id", userId)
        .eq("sgp_titulo_id", n.sgp_titulo_id)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabaseAdmin
          .from("faturas")
          .update(row as never)
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        atualizadas++;
      } else {
        const { error } = await supabaseAdmin.from("faturas").insert(row as never);
        if (error) throw new Error(error.message);
        inseridas++;
      }
    }


    return { ok: true as const, total: titulos.length, inseridas, atualizadas };
  });

