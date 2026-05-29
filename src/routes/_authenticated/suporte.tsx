import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, LifeBuoy, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/suporte")({
  head: () => ({ meta: [{ title: "Suporte — TRIX ISP" }] }),
  component: SuportePage,
});

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-warning/15 text-warning-foreground border-warning/40",
  em_andamento: "bg-primary/15 text-primary border-primary/40",
  fechado: "bg-success/15 text-success border-success/40",
};

function SuportePage() {
  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("tickets").select("*").eq("cliente_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Suporte</h1>
          <p className="text-sm text-muted-foreground">Seus chamados e atendimentos.</p>
        </div>
        <Button asChild className="bg-gradient-brand text-white shadow-brand">
          <Link to="/suporte/novo"><Plus className="size-4 mr-1" /> Novo</Link>
        </Button>
      </header>

      {tickets.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center text-white mx-auto mb-3 shadow-glow">
            <LifeBuoy className="size-6" />
          </div>
          <div className="font-display font-semibold">Sem chamados ainda</div>
          <p className="text-sm text-muted-foreground mt-1">Abra um chamado para falar com o suporte.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} to="/suporte/$ticketId" params={{ ticketId: t.id }}>
              <Card className="p-4 hover:shadow-brand transition-all border-border/60 flex items-start gap-3">
                <div className="size-10 rounded-lg bg-secondary grid place-items-center text-secondary-foreground">
                  <LifeBuoy className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.titulo}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.descricao}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(t.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={STATUS_COLORS[t.status] + " text-xs"}>
                    {t.status.replace("_", " ")}
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
