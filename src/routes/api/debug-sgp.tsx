import { createFileRoute } from "@tanstack/react-router";
import { sgpProbe } from "@/lib/integrations/sgp.debug.functions";

export const Route = createFileRoute("/api/debug-sgp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { path, cpfcnpj } = await request.json();
        const r = await sgpProbe({ data: { path, cpfcnpj } });
        return new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
