import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Acessar — TRIX ISP" },
      { name: "description", content: "O acesso ao portal TRIX ISP é feito apenas com o CPF do titular." },
      { property: "og:title", content: "Acessar — TRIX ISP" },
      { property: "og:description", content: "O acesso ao portal TRIX ISP é feito apenas com o CPF do titular." },
    ],
  }),
  // Não existe mais cadastro: o acesso é só com o CPF do titular.
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
