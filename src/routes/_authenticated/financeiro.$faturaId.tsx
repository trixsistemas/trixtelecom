import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Copy, QrCode, FileText, CheckCircle2, CreditCard, ExternalLink } from "lucide-react";
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
  const [tab, setTab] = useState<"pix" | "cartao" | "boleto">("pix");

  const { data: fatura, isLoading } = useQuery({
    queryKey: ["fatura", faturaId],
    queryFn: async () => {
      const { data } = await supabase.from("faturas").select("*").eq("id", faturaId).single();
      return data;
    },
  });

  if (isLoading || !fatura) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  const isPaid = fatura.status === "pago";
  const hasPix = Boolean(fatura.pix_payload);
  const hasBoleto = Boolean(fatura.linha_digitavel);
  const hasLink = Boolean(fatura.link_pagamento);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

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
            <CheckCircle2 className="size-4" />
            Paga{fatura.data_pagamento ? ` em ${new Date(fatura.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
          </div>
        )}
      </Card>

      {!isPaid && (
        <>
          {!hasPix && !hasBoleto && !hasLink && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma opção de pagamento disponível no momento. Tente sincronizar novamente na tela de Financeiro
              ou entre em contato com o suporte.
            </Card>
          )}

          {(hasPix || hasBoleto || hasLink) && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pix" disabled={!hasPix}>
                  <QrCode className="size-4 mr-2" /> PIX
                </TabsTrigger>
                <TabsTrigger value="cartao" disabled={!hasLink}>
                  <CreditCard className="size-4 mr-2" /> Cartão
                </TabsTrigger>
                <TabsTrigger value="boleto" disabled={!hasBoleto}>
                  <FileText className="size-4 mr-2" /> Boleto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pix" className="mt-4">
                <Card className="p-6 text-center space-y-4">
                  {hasPix ? (
                    <>
                      {fatura.pix_qrcode && (
                        <img src={fatura.pix_qrcode} alt="QR Code PIX" className="mx-auto rounded-lg border" />
                      )}
                      <div className="text-xs text-muted-foreground break-all bg-muted p-3 rounded font-mono">
                        {fatura.pix_payload}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => copy(fatura.pix_payload!, "Código PIX")}
                      >
                        <Copy className="size-4 mr-2" /> Copiar código PIX
                      </Button>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">PIX indisponível para esta fatura.</div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="cartao" className="mt-4">
                <Card className="p-6 space-y-4 text-center">
                  {hasLink ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Você será redirecionado para a página segura do provedor para pagar com cartão de crédito ou débito.
                      </p>
                      <a href={fatura.link_pagamento!} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full bg-gradient-brand text-white shadow-brand">
                          <ExternalLink className="size-4 mr-2" /> Pagar com cartão
                        </Button>
                      </a>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Pagamento por cartão indisponível para esta fatura.
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="boleto" className="mt-4">
                <Card className="p-6 space-y-3">
                  {hasBoleto ? (
                    <>
                      <div className="text-sm text-muted-foreground">Linha digitável</div>
                      <div className="font-mono text-sm bg-muted p-3 rounded break-all">
                        {fatura.linha_digitavel}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => copy(fatura.linha_digitavel!, "Linha digitável")}
                      >
                        <Copy className="size-4 mr-2" /> Copiar linha digitável
                      </Button>
                      {hasLink && (
                        <a href={fatura.link_pagamento!} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" className="w-full">
                            <ExternalLink className="size-4 mr-2" /> Abrir boleto
                          </Button>
                        </a>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center">
                      Boleto indisponível para esta fatura.
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
