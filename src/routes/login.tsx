import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Wifi, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — TRIX ISP" },
      { name: "description", content: "Acesse o portal do cliente TRIX ISP." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta!");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Brand panel */}
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
            Acompanhe faturas, abra chamados, teste sua velocidade e gerencie tudo do seu plano em um só lugar.
          </p>
          <div className="flex items-center gap-2 text-sm text-white/70 pt-2">
            <Zap className="size-4" /> Latência mínima · Suporte 24/7
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden flex items-center gap-2">
            <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center text-white shadow-brand">
              <Wifi className="size-5" />
            </div>
            <span className="font-display text-2xl font-bold">TRIX</span>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Entrar</h2>
            <p className="text-sm text-muted-foreground">Use seu e-mail e senha de cliente.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-white shadow-brand hover:opacity-95">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center">
            Ainda não tem conta?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">Cadastre-se</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
