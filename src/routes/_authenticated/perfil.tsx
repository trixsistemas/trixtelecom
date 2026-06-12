import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { User, LogOut, ShieldCheck, Wifi, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateMyProfile } from "@/lib/profile.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — TRIX ISP" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", telefone: "", cpf_cnpj: "" });
  const salvarPerfil = useServerFn(updateMyProfile);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  useEffect(() => {
    if (profile) setForm({ nome: profile.nome ?? "", telefone: profile.telefone ?? "", cpf_cnpj: profile.cpf_cnpj ?? "" });
  }, [profile]);

  const salvar = useMutation({
    mutationFn: async () => {
      await salvarPerfil({ data: form });
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Perfil</h1>
        <p className="text-sm text-muted-foreground">Seus dados cadastrais e do plano.</p>
      </header>

      <Card className="p-6 bg-gradient-card border-0 shadow-card">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-gradient-brand grid place-items-center text-white shadow-brand">
            <User className="size-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl font-bold truncate">{profile?.nome || "—"}</div>
            <div className="text-sm text-muted-foreground truncate">{profile?.email}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-card p-3 rounded-lg border">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Wifi className="size-3" /> Plano</div>
            <div className="font-display font-semibold">{profile?.plano}</div>
          </div>
          <div className="bg-card p-3 rounded-lg border">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="size-3" /> Status</div>
            <div className="font-display font-semibold capitalize">{profile?.status}</div>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display font-semibold">Dados cadastrais</h2>
        <div className="space-y-2">
          <Label>Nome completo</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>CPF/CNPJ</Label>
            <Input value={form.cpf_cnpj} readOnly disabled />
            <p className="text-xs text-muted-foreground">Para corrigir o documento, fale com o suporte.</p>
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
        </div>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="w-full bg-gradient-brand text-white shadow-brand">
          {salvar.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </Card>

      {(profile?.endereco_logradouro || profile?.endereco_cidade) && (
        <Card className="p-6 space-y-3">
          <h2 className="font-display font-semibold flex items-center gap-2"><MapPin className="size-4" /> Endereço de instalação</h2>
          <div className="text-sm text-muted-foreground">
            {[
              profile.endereco_logradouro,
              profile.endereco_numero,
              profile.endereco_bairro,
            ].filter(Boolean).join(", ")}
            <br />
            {[profile.endereco_cidade, profile.endereco_uf].filter(Boolean).join(" / ")}
            {profile.endereco_cep ? ` — CEP ${profile.endereco_cep}` : ""}
          </div>
        </Card>
      )}

      {((profile?.telefones?.length ?? 0) > 0 || (profile?.emails?.length ?? 0) > 0) && (
        <Card className="p-6 space-y-3">
          <h2 className="font-display font-semibold">Contatos cadastrados no provedor</h2>
          {(profile?.telefones?.length ?? 0) > 0 && (
            <div className="space-y-1">
              {profile!.telefones!.map((t) => (
                <div key={t} className="text-sm flex items-center gap-2"><Phone className="size-3 text-muted-foreground" /> {t}</div>
              ))}
            </div>
          )}
          {(profile?.emails?.length ?? 0) > 0 && (
            <div className="space-y-1">
              {profile!.emails!.map((m) => (
                <div key={m} className="text-sm flex items-center gap-2"><Mail className="size-3 text-muted-foreground" /> {m}</div>
              ))}
            </div>
          )}
        </Card>
      )}

      {profile?.motivo_status && (
        <Card className="p-4 border-warning/30 bg-warning/10 text-sm">
          <span className="font-medium">Status do contrato:</span> {profile.motivo_status}
        </Card>
      )}

      <Button variant="outline" onClick={logout} className="w-full">
        <LogOut className="size-4 mr-2" /> Sair da conta
      </Button>
    </div>
  );
}
