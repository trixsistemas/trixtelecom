import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      nome: z.string().trim().min(1).max(120),
      telefone: z.string().trim().max(30),
      cpf_cnpj: z.string().trim().min(11).max(20),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: currentProfile, error: readError } = await supabase
      .from("profiles")
      .select("cpf_cnpj")
      .eq("id", context.userId)
      .single();

    if (readError) {
      throw new Error("Não foi possível carregar seu cadastro.");
    }

    if (currentProfile?.cpf_cnpj && currentProfile.cpf_cnpj !== data.cpf_cnpj) {
      throw new Error("O CPF/CNPJ não pode ser alterado por aqui. Fale com o suporte.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        nome: data.nome,
        telefone: data.telefone || null,
      })
      .eq("id", context.userId);

    if (updateError) {
      throw new Error("Não foi possível salvar seu perfil.");
    }

    return { ok: true as const };
  });