import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Wifi, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validarClienteSgp } from "@/lib/integrations/sgp.functions";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar conta — TRIX ISP" },
      { name: "description", content: "Crie sua conta no portal do cliente TRIX ISP." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const validarSgp = useServerFn(validarClienteSgp);
  const [form, setForm] = useState({ nome: "", email: "", cpf_cnpj: "", telefone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [sgpInfo, setSgpInfo] = useState<{ nome?: string; status?: string } | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1) Valida o CPF/CNPJ no SGP antes de criar a conta
    const check = await validarSgp({ data: { cpf_cnpj: form.cpf_cnpj } });
    if (!check.found) {
      setLoading(false);
      toast.error("CPF/CNPJ não encontrado", {
        description: check.reason ?? "Verifique seus dados ou fale com o suporte.",
      });
      return;
    }
    setSgpInfo({ nome: check.nome, status: check.status });

    // 2) Cria a conta no Lovable Cloud com os dados do cliente
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          nome: form.nome || check.nome || "",
          cpf_cnpj: form.cpf_cnpj,
          telefone: form.telefone,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível cadastrar", { description: error.message });
      return;
    }
    toast.success("Cadastro criado!", { description: "Verifique seu e-mail para confirmar e entrar." });
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center text-white shadow-brand">
            <Wifi className="size-5" />
          </div>
          <span className="font-display text-2xl font-bold">TRIX</span>
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Criar conta</h1>
          <p className="text-sm text-muted-foreground">Preencha seus dados para acessar o portal.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF/CNPJ</Label>
              <Input id="cpf" required value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tel">Telefone</Label>
              <Input id="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {sgpInfo?.nome && (
            <div className="rounded-md border border-success/30 bg-success/10 text-success-foreground p-3 text-sm flex items-start gap-2">
              <ShieldCheck className="size-4 mt-0.5 text-success" />
              <div>
                <div className="font-medium">Cliente identificado no SGP</div>
                <div className="text-muted-foreground">{sgpInfo.nome} · {sgpInfo.status}</div>
              </div>
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-white shadow-brand">
            {loading ? "Validando..." : "Criar conta"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground text-center">
          Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
