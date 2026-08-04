import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { getLegalDoc } from "@/lib/legal-content";

export const Route = createFileRoute("/_authenticated/legal/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — BlogAI Pro" },
      {
        name: "description",
        content:
          "Regras de uso do BlogAI Pro: planos, créditos, pagamentos, cancelamento, IA e propriedade intelectual.",
      },
      { property: "og:title", content: "Termos de Uso — BlogAI Pro" },
      {
        property: "og:description",
        content: "Condições de uso, responsabilidades e limitações do BlogAI Pro.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { i18n } = useTranslation("legal");
  return <LegalDocument doc={getLegalDoc(i18n.language, "termos")} />;
}
