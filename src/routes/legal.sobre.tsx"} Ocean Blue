import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { getLegalDoc } from "@/lib/legal-content";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/legal/sobre")({
  component: AboutPage,
});

function AboutPage() {
  const { i18n } = useTranslation("legal");
  // O tipo LegalDocId aceita "sobre" conforme verificado no arquivo legal-content.ts
  return <LegalDocument doc={getLegalDoc(i18n.language, "sobre" as any)} />;
}
