import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Wifi, Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrarComCpf } from "@/lib/auth-cpf.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — TRIX ISP" },
      { name: "description", content: "Acesse o portal do cliente TRIX ISP com o CPF do titular." },
      { property: "og:title", content: "Entrar — TRIX ISP" },
      { property: "og:description", content: "Acesse o portal do cliente TRIX ISP com o CPF do titular." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function LoginPage() {
  const navigate = useNavigate();
  const entrar = useServerFn(entrarComCpf);
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await entrar({ data: { cpf_cnpj: cpf } });
      if (!res.ok) {
        toast.error("Não foi possível entrar", { description: res.reason });
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        token_hash: res.token_hash,
        type: "magiclink",
      });
      if (error) {
        toast.error("Não foi possível entrar", { description: error.message });
        return;
      }
      toast.success(`Bem-vindo, ${res.nome.split(" ")[0]}!`);
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Falha na conexão", { description: "Tente novamente em instantes." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:flex flex-col justify-between p-10 bg-gradient-hero text-white overflow-hidden">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,white,transparent_40%)]" />
        <div className="relative z-10 flex items-center gap-2">
          <div className="size-10 rounded-xl bg-white/15 backdrop-blur grid place-items-center shadow-glow">
            <Wifi className="size-5" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">TRIX</span>
        </div>
        <div className="relative z-10 space-y-3">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Sua fibra,<br />no seu ritmo.
          </h1>
          <p className="text-white/80 max-w-sm">
            Faturas, chamados e teste de velocidade em um só lugar — basta o CPF do titular.
          </p>
          <div className="flex items-center gap-2 text-sm text-white/70 pt-2">
            <Zap className="size-4" /> Latência mínima · Suporte 24/7
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden flex items-center gap-2">
            <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center text-white shadow-brand">
              <Wifi className="size-5" />
            </div>
            <span className="font-display text-2xl font-bold">TRIX</span>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Acessar minha conta</h2>
            <p className="text-sm text-muted-foreground">
              Informe o CPF do titular da assinatura. Sem senha.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF do titular</Label>
              <Input
                id="cpf"
                inputMode="numeric"
                autoComplete="off"
                required
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                className="text-lg tracking-wide"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-white shadow-brand hover:opacity-95">
              {loading ? "Verificando..." : "Entrar"}
            </Button>
          </form>
          <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="size-4 mt-0.5 text-primary" />
            <span>Validamos seu CPF direto no sistema do provedor. Não é preciso criar conta.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
