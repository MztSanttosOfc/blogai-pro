import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { getLegalDoc } from "@/lib/legal-content";

export const Route = createFileRoute("/_authenticated/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Política de Cookies — BlogAI Pro" },
      {
        name: "description",
        content:
          "Cookies essenciais, de autenticação, de preferências e analíticos usados pelo BlogAI Pro.",
      },
      { property: "og:title", content: "Política de Cookies — BlogAI Pro" },
      {
        property: "og:description",
        content: "Como o BlogAI Pro usa cookies e armazenamento local no seu dispositivo.",
      },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  const { i18n } = useTranslation("legal");
  return <LegalDocument doc={getLegalDoc(i18n.language, "cookies")} />;
}
