import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { getLegalDoc } from "@/lib/legal-content";
import { useTranslation as useI18n } from "react-i18next";

export const Route = createFileRoute("/legal/sobre")({
  component: AboutPage,
});

function AboutPage() {
  const { i18n } = useI18n("legal");
  return <LegalDocument doc={getLegalDoc(i18n.language, "sobre")} />;
}
