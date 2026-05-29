import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Gauge, Download, Upload, Activity, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/velocidade")({
  head: () => ({ meta: [{ title: "Teste de Velocidade — TRIX ISP" }] }),
  component: VelocidadePage,
});

type Result = { download: number; upload: number; latencia: number; jitter: number };

async function medirLatencia(): Promise<{ latencia: number; jitter: number }> {
  const samples: number[] = [];
  for (let i = 0; i < 6; i++) {
    const t0 = performance.now();
    await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
    samples.push(performance.now() - t0);
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const jitter = Math.sqrt(samples.map((s) => (s - avg) ** 2).reduce((a, b) => a + b, 0) / samples.length);
  return { latencia: Math.round(avg * 10) / 10, jitter: Math.round(jitter * 10) / 10 };
}

async function medirDownload(): Promise<number> {
  // ~10MB de download via Cloudflare
  const url = "https://speed.cloudflare.com/__down?bytes=10000000";
  const t0 = performance.now();
  const res = await fetch(url, { cache: "no-store" });
  const blob = await res.blob();
  const dt = (performance.now() - t0) / 1000;
  const mbits = (blob.size * 8) / 1_000_000;
  return Math.round((mbits / dt) * 10) / 10;
}

async function medirUpload(): Promise<number> {
  const bytes = 2_000_000;
  const data = new Uint8Array(bytes);
  const t0 = performance.now();
  await fetch("https://speed.cloudflare.com/__up", { method: "POST", body: data, cache: "no-store" });
  const dt = (performance.now() - t0) / 1000;
  return Math.round(((bytes * 8) / 1_000_000 / dt) * 10) / 10;
}

function VelocidadePage() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);

  const { data: historico = [] } = useQuery({
    queryKey: ["velocidade-historico"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("teste_velocidade").select("*").eq("cliente_id", user.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const salvar = useMutation({
    mutationFn: async (r: Result) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("teste_velocidade").insert({
        cliente_id: user.id,
        download_mbps: r.download,
        upload_mbps: r.upload,
        latencia_ms: r.latencia,
        jitter_ms: r.jitter,
        servidor_teste: "Cloudflare",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["velocidade-historico"] }),
  });

  const rodarTeste = async () => {
    try {
      setRunning(true);
      setResult(null);
      setPhase("Medindo latência...");
      const { latencia, jitter } = await medirLatencia();
      setPhase("Medindo download...");
      const download = await medirDownload();
      setPhase("Medindo upload...");
      const upload = await medirUpload();
      const r = { download, upload, latencia, jitter };
      setResult(r);
      setPhase("");
      await salvar.mutateAsync(r);
      toast.success("Teste concluído!");
    } catch (e) {
      toast.error("Erro no teste", { description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Teste de velocidade</h1>
        <p className="text-sm text-muted-foreground">Meça download, upload e latência da sua conexão.</p>
      </header>

      <Card className="p-8 bg-gradient-hero text-white border-0 shadow-brand text-center space-y-6">
        <div className="size-20 rounded-3xl bg-white/15 backdrop-blur grid place-items-center mx-auto shadow-glow">
          <Gauge className={`size-10 ${running && "animate-spin"}`} />
        </div>
        {result ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <Metric icon={Download} label="Download" value={`${result.download} Mbps`} />
            <Metric icon={Upload} label="Upload" value={`${result.upload} Mbps`} />
            <Metric icon={Activity} label="Latência" value={`${result.latencia} ms`} />
            <Metric icon={Activity} label="Jitter" value={`${result.jitter} ms`} />
          </div>
        ) : (
          <p className="text-white/80">{running ? phase : "Clique abaixo para iniciar"}</p>
        )}
        <Button size="lg" onClick={rodarTeste} disabled={running} className="bg-white text-primary hover:bg-white/90 shadow-glow font-semibold">
          <Play className="size-4 mr-2" /> {running ? "Medindo..." : result ? "Testar novamente" : "Iniciar teste"}
        </Button>
      </Card>

      <div>
        <h2 className="font-display font-semibold mb-3">Histórico recente</h2>
        <div className="space-y-2">
          {historico.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum teste ainda.</Card>
          )}
          {historico.map((h) => (
            <Card key={h.id} className="p-4 flex items-center gap-4">
              <div className="size-10 rounded-lg bg-secondary grid place-items-center">
                <Gauge className="size-4" />
              </div>
              <div className="flex-1 text-sm">
                <div className="font-medium">↓ {h.download_mbps} Mbps · ↑ {h.upload_mbps} Mbps</div>
                <div className="text-xs text-muted-foreground">
                  Latência {h.latencia_ms} ms · {new Date(h.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-xs text-white/70"><Icon className="size-3" /> {label}</div>
      <div className="font-display font-bold text-xl mt-0.5">{value}</div>
    </div>
  );
}
