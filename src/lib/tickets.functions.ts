import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const fecharMeuTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      ticketId: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: ticket, error: ticketError } = await context.supabase
      .from("tickets")
      .select("id, status")
      .eq("id", data.ticketId)
      .eq("cliente_id", context.userId)
      .maybeSingle();

    if (ticketError) {
      throw new Error("Não foi possível validar o chamado.");
    }

    if (!ticket) {
      throw new Error("Chamado não encontrado.");
    }

    if (ticket.status === "fechado") {
      return { ok: true as const, alreadyClosed: true as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("tickets")
      .update({
        status: "fechado",
        closed_at: now,
        updated_at: now,
      })
      .eq("id", data.ticketId)
      .eq("cliente_id", context.userId);

    if (updateError) {
      throw new Error("Não foi possível fechar o chamado.");
    }

    return { ok: true as const, alreadyClosed: false as const };
  });