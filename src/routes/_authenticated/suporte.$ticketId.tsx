import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fecharMeuTicket } from "@/lib/tickets.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/suporte/$ticketId")({
  head: () => ({ meta: [{ title: "Chamado — TRIX ISP" }] }),
  component: TicketPage,
});

function TicketPage() {
  const { ticketId } = Route.useParams();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const fecharTicket = useServerFn(fecharMeuTicket);

  const { data } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ticket: null, mensagens: [] };

      const [{ data: ticket }, { data: mensagens }] = await Promise.all([
        supabase.from("tickets").select("*").eq("id", ticketId).eq("cliente_id", user.id).maybeSingle(),
        supabase.from("ticket_mensagens").select("*").eq("ticket_id", ticketId).eq("cliente_id", user.id).order("created_at", { ascending: true }),
      ]);
      return { ticket, mensagens: mensagens ?? [] };
    },
  });

  const responder = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem usuário");
      const { error } = await supabase.from("ticket_mensagens").insert({
        ticket_id: ticketId,
        cliente_id: user.id,
        autor_tipo: "cliente",
        mensagem: msg,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });

  const fechar = useMutation({
    mutationFn: async () => {
      await fecharTicket({ data: { ticketId } });
    },

    onSuccess: () => {
      toast.success("Chamado fechado");
      qc.invalidateQueries();
    },
  });

  if (!data?.ticket) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  const { ticket, mensagens } = data;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <Link to="/suporte" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <Card className="p-6 bg-gradient-card border-0 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-bold">{ticket.titulo}</h1>
            <div className="text-xs text-muted-foreground mt-1">
              {ticket.categoria} · prioridade {ticket.prioridade}
            </div>
          </div>
          <Badge variant="outline" className="capitalize">{ticket.status.replace("_", " ")}</Badge>
        </div>
        <p className="text-sm mt-3 whitespace-pre-wrap">{ticket.descricao}</p>
      </Card>

      <div className="space-y-3">
        {mensagens.map((m) => (
          <div key={m.id} className={`flex ${m.autor_tipo === "cliente" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.autor_tipo === "cliente" ? "bg-gradient-brand text-white shadow-brand" : "bg-muted"}`}>
              <div className="text-xs opacity-70 mb-0.5">{m.autor_tipo === "cliente" ? "Você" : "Suporte"}</div>
              <div className="text-sm whitespace-pre-wrap">{m.mensagem}</div>
            </div>
          </div>
        ))}
        {mensagens.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Aguardando atendimento...</p>
        )}
      </div>

      {ticket.status !== "fechado" && (
        <>
          <Card className="p-3">
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); if (msg.trim()) responder.mutate(); }} className="flex gap-2">
              <Textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Escreva sua mensagem..." className="flex-1 resize-none" />
              <Button type="submit" disabled={!msg.trim() || responder.isPending} className="bg-gradient-brand text-white self-end">
                <Send className="size-4" />
              </Button>
            </form>
          </Card>
          <Button variant="outline" className="w-full" onClick={() => fechar.mutate()} disabled={fechar.isPending}>
            <CheckCircle2 className="size-4 mr-2" /> Marcar como resolvido
          </Button>
        </>
      )}
    </div>
  );
}
