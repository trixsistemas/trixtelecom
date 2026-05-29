import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Copy, QrCode, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/financeiro/$faturaId")({
  head: () => ({ meta: [{ title: "Fatura — TRIX ISP" }] }),
  component: FaturaPage,
});

function FaturaPage() {
  const { faturaId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"pix" | "boleto">("pix");

  const { data: fatura, isLoading } = useQuery({
    queryKey: ["fatura", faturaId],
    queryFn: async () => {
      const { data } = await supabase.from("faturas").select("*").eq("id", faturaId).single();
      return data;
    },
  });

  const gerarPix = useMutation({
    mutationFn: async () => {
      const payload = `00020126580014BR.GOV.BCB.PIX0136trix-${faturaId.slice(0, 8)}5204000053039865802BR5913TRIX ISP LTDA6009SAO PAULO62070503***6304ABCD`;
      const qrcode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload)}`;
      const { error } = await supabase.from("faturas")
        .update({ pix_payload: payload, pix_qrcode: qrcode })
        .eq("id", faturaId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fatura", faturaId] }),
  });

  const simularPagamento = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("faturas")
        .update({ status: "pago", data_pagamento: new Date().toISOString().slice(0, 10), metodo_pagamento: tab })
        .eq("id", faturaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento confirmado!", { description: "Sua conexão foi liberada." });
      qc.invalidateQueries();
      navigate({ to: "/financeiro" });
    },
  });

  if (isLoading || !fatura) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  const isPaid = fatura.status === "pago";

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <Link to="/financeiro" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <Card className="p-6 bg-gradient-card border-0 shadow-card">
        <div className="text-sm text-muted-foreground">{fatura.descricao}</div>
        <div className="font-display text-4xl font-bold mt-1">
          {Number(fatura.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Vencimento: {new Date(fatura.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
        </div>
        {isPaid && (
          <div className="mt-4 flex items-center gap-2 text-success text-sm font-medium">
            <CheckCircle2 className="size-4" /> Paga em {new Date(fatura.data_pagamento! + "T00:00:00").toLocaleDateString("pt-BR")}
          </div>
        )}
      </Card>

      {!isPaid && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "pix" | "boleto")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pix"><QrCode className="size-4 mr-2" /> PIX</TabsTrigger>
            <TabsTrigger value="boleto"><FileText className="size-4 mr-2" /> Boleto</TabsTrigger>
          </TabsList>

          <TabsContent value="pix" className="mt-4">
            <Card className="p-6 text-center space-y-4">
              {fatura.pix_qrcode ? (
                <>
                  <img src={fatura.pix_qrcode} alt="QR Code PIX" className="mx-auto rounded-lg border" />
                  <div className="text-xs text-muted-foreground break-all bg-muted p-3 rounded font-mono">
                    {fatura.pix_payload}
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => {
                    navigator.clipboard.writeText(fatura.pix_payload!);
                    toast.success("Código PIX copiado!");
                  }}>
                    <Copy className="size-4 mr-2" /> Copiar código PIX
                  </Button>
                </>
              ) : (
                <Button className="w-full bg-gradient-brand text-white shadow-brand" onClick={() => gerarPix.mutate()} disabled={gerarPix.isPending}>
                  {gerarPix.isPending ? "Gerando..." : "Gerar PIX"}
                </Button>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="boleto" className="mt-4">
            <Card className="p-6 space-y-3">
              <div className="text-sm text-muted-foreground">Linha digitável (mock)</div>
              <div className="font-mono text-sm bg-muted p-3 rounded break-all">
                23793.38128 60082.190351 41085.901022 1 9{Math.floor(Number(fatura.valor) * 100).toString().padStart(10, "0")}
              </div>
              <Button variant="outline" className="w-full" onClick={() => toast.success("Boleto copiado!")}>
                <Copy className="size-4 mr-2" /> Copiar linha digitável
              </Button>
            </Card>
          </TabsContent>

          <Button
            className="w-full mt-4 bg-gradient-success text-white shadow-card"
            onClick={() => simularPagamento.mutate()}
            disabled={simularPagamento.isPending}
          >
            <CheckCircle2 className="size-4 mr-2" /> Simular pagamento
          </Button>
        </Tabs>
      )}
    </div>
  );
}
