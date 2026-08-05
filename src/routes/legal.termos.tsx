import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { getLegalDoc } from "@/lib/legal-content";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/legal/termos")({
  component: TermsPage,
});

function TermsPage() {
  const { i18n } = useTranslation("legal");
  return <LegalDocument doc={getLegalDoc(i18n.language, "termos")} />;
}
