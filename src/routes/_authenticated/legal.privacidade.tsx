import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { getLegalDoc } from "@/lib/legal-content";

export const Route = createFileRoute("/_authenticated/legal/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — BlogAI Pro" },
      {
        name: "description",
        content:
          "Saiba quais dados o BlogAI Pro coleta, por que coleta, como armazena e como você pode excluí-los.",
      },
      { property: "og:title", content: "Política de Privacidade — BlogAI Pro" },
      {
        property: "og:description",
        content: "Transparência total sobre dados, integrações e segurança no BlogAI Pro.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { i18n } = useTranslation("legal");
  return <LegalDocument doc={getLegalDoc(i18n.language, "privacidade")} />;
}
