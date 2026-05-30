import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wifi, ArrowRight, Receipt, LifeBuoy, Gauge, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sincronizarMeuPerfilSgp } from "@/lib/integrations/sgp.functions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Início — TRIX ISP" }] }),
  component: DashboardPage,
});

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function DashboardPage() {
  const qc = useQueryClient();
  const syncFn = useServerFn(sincronizarMeuPerfilSgp);

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: profile }, { data: faturas }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("faturas").select("*").eq("cliente_id", user.id).order("data_vencimento", { ascending: true }),
      ]);
      return { profile, faturas: faturas ?? [] };
    },
  });

  const profile = data?.profile;
  const faturas = data?.faturas ?? [];
  const aberta = faturas.find((f) => f.status === "aberto");
  const vencida = aberta && new Date(aberta.data_vencimento) < new Date(new Date().toDateString());
  // Status real vem do SGP quando sincronizado; cai pro fallback local caso contrário.
  const sgpBloqueado = profile?.sgp_status && /(bloq|suspens|inativo|cancel)/i.test(profile.sgp_status);
  const conexaoBloqueada = sgpBloqueado || profile?.status === "bloqueado" || vencida;

  const syncMutation = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: () => {
      toast.success("Dados sincronizados com o SGP");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => toast.error("Falha ao sincronizar", { description: err.message }),
  });

  // Auto-sync no primeiro acesso (ou quando ainda não foi sincronizado)
  useEffect(() => {
    if (profile && !profile.sgp_synced_at && profile.cpf_cnpj && !syncMutation.isPending) {
      syncMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.sgp_synced_at]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Hero status */}
      <Card className="relative overflow-hidden border-0 p-6 md:p-8 bg-gradient-hero text-white shadow-brand">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm">Olá,</p>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              {profile?.nome || "Cliente"} 👋
            </h1>
            <div className="mt-4 flex items-center gap-2">
              <div className={`size-2.5 rounded-full ${conexaoBloqueada ? "bg-destructive" : "bg-success"} ${!conexaoBloqueada && "animate-pulse"}`} />
              <span className="text-sm">
                {conexaoBloqueada ? "Conexão bloqueada" : "Conexão ativa"} · {profile?.plano ?? "Fibra"}
              </span>
            </div>
          </div>
          <div className="size-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center shadow-glow">
            <Wifi className="size-7" />
          </div>
        </div>
      </Card>

      {/* Fatura em destaque */}
      {aberta ? (
        <Card className="p-6 bg-gradient-card shadow-card border-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {vencida ? (
              <><AlertCircle className="size-4 text-destructive" /> Fatura vencida</>
            ) : (
              <><Receipt className="size-4 text-primary" /> Próxima fatura</>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-display text-3xl font-bold">{formatBRL(Number(aberta.valor))}</div>
              <div className="text-sm text-muted-foreground">
                Vencimento {formatDate(aberta.data_vencimento)} · {aberta.descricao}
              </div>
            </div>
            <Button asChild className="bg-gradient-brand text-white shadow-brand">
              <Link to="/financeiro/$faturaId" params={{ faturaId: aberta.id }}>
                Pagar agora <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 bg-gradient-success text-white shadow-card border-0">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-6" />
            <div>
              <div className="font-display font-bold text-lg">Tudo em dia!</div>
              <div className="text-sm text-white/85">Você não tem faturas em aberto.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Atalhos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Shortcut to="/financeiro" icon={Receipt} title="Faturas" desc="2ª via, PIX e boleto" />
        <Shortcut to="/velocidade" icon={Gauge} title="Velocidade" desc="Teste sua conexão" />
        <Shortcut to="/suporte" icon={LifeBuoy} title="Suporte" desc="Abrir chamado" />
      </div>
    </div>
  );
}

function Shortcut({ to, icon: Icon, title, desc }: { to: string; icon: typeof Receipt; title: string; desc: string }) {
  return (
    <Link to={to} className="group">
      <Card className="p-4 h-full hover:shadow-brand hover:-translate-y-0.5 transition-all border-border/60">
        <div className="size-10 rounded-lg bg-gradient-brand grid place-items-center text-white shadow-glow mb-3">
          <Icon className="size-5" />
        </div>
        <div className="font-display font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </Card>
    </Link>
  );
}
