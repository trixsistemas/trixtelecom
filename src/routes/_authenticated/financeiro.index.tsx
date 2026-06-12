import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Receipt, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sincronizarMinhasFaturasSgp } from "@/lib/integrations/sgp.functions";

export const Route = createFileRoute("/_authenticated/financeiro/")({
  head: () => ({ meta: [{ title: "Financeiro — TRIX ISP" }] }),
  component: FinanceiroPage,
});

const STATUS = {
  aberto: { label: "Em aberto", className: "bg-warning/15 text-warning-foreground border-warning/40" },
  pago: { label: "Pago", className: "bg-success/15 text-success border-success/40" },
  vencido: { label: "Vencido", className: "bg-destructive/15 text-destructive border-destructive/40" },
} as const;

function FinanceiroPage() {
  const qc = useQueryClient();
  const sincronizar = useServerFn(sincronizarMinhasFaturasSgp);

  const { data: faturas = [], isLoading } = useQuery({
    queryKey: ["faturas"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("faturas")
        .select("*")
        .eq("cliente_id", user.id)
        .order("data_vencimento", { ascending: false });
      return data ?? [];
    },
  });

  const sync = useMutation({
    mutationFn: () => sincronizar({}),
    onSuccess: (r) => {
      toast.success("Faturas sincronizadas", {
        description: `${r.inseridas} nova(s), ${r.atualizadas} atualizada(s).`,
      });
      qc.invalidateQueries({ queryKey: ["faturas"] });
    },
    onError: (e: Error) => toast.error("Falha ao sincronizar", { description: e.message }),
  });

  // Auto-sync na primeira carga
  useEffect(() => {
    sync.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const computed = faturas.map((f) => ({
    ...f,
    statusUI: (f.status === "aberto" && f.data_vencimento < today ? "vencido" : f.status) as keyof typeof STATUS,
  }));

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Suas faturas direto do provedor.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
          <RefreshCw className={"size-4 mr-2 " + (sync.isPending ? "animate-spin" : "")} />
          Sincronizar
        </Button>
      </header>

      <div className="space-y-3">
        {isLoading || sync.isPending ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Carregando faturas...</Card>
        ) : computed.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma fatura encontrada.
          </Card>
        ) : (
          computed.map((f) => {
            const s = STATUS[f.statusUI];
            return (
              <Link key={f.id} to="/financeiro/$faturaId" params={{ faturaId: f.id }}>
                <Card className="p-4 flex items-center gap-4 hover:shadow-brand transition-all border-border/60">
                  <div className="size-11 rounded-lg bg-gradient-brand grid place-items-center text-white shadow-glow">
                    <Receipt className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{f.descricao || "Mensalidade"}</div>
                    <div className="text-xs text-muted-foreground">
                      Venc. {new Date(f.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold">
                      {Number(f.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                    <Badge variant="outline" className={s.className + " text-xs mt-1"}>{s.label}</Badge>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
