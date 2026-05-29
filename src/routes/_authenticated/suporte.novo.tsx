import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/suporte/novo")({
  head: () => ({ meta: [{ title: "Novo chamado — TRIX ISP" }] }),
  component: NovoTicketPage,
});

function NovoTicketPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ titulo: "", descricao: "", categoria: "tecnico", prioridade: "normal" });

  const criar = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem usuário");
      const { data, error } = await supabase.from("tickets").insert({
        cliente_id: user.id,
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        prioridade: form.prioridade,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (t) => {
      toast.success("Chamado aberto!");
      navigate({ to: "/suporte/$ticketId", params: { ticketId: t.id } });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    criar.mutate();
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6">
      <Link to="/suporte" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Novo chamado</h1>
        <p className="text-sm text-muted-foreground">Descreva sua solicitação para o nosso time.</p>
      </header>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" required maxLength={120} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Internet lenta à noite" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" required rows={6} maxLength={2000} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Conte com detalhes o que está acontecendo..." />
          </div>
          <Button type="submit" disabled={criar.isPending} className="w-full bg-gradient-brand text-white shadow-brand">
            {criar.isPending ? "Enviando..." : "Abrir chamado"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
