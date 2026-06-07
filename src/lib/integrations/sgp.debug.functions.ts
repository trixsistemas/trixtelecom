import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const sgpProbe = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ path: z.string(), cpfcnpj: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const baseUrl = new URL(process.env.SGP_BASE_URL!).origin;
    const body = {
      token: process.env.SGP_TOKEN,
      app: process.env.SGP_APP,
      cpfcnpj: data.cpfcnpj.replace(/\D+/g, ""),
    };
    const res = await fetch(`${baseUrl}${data.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text.slice(0, 4000) };
  });
