// BlogAI Pro — v1.1 Language switcher (dropdown com bandeiras).
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, setLanguage, type SupportedLanguage } from "@/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const current = (SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage)
    ?.code ?? "pt-BR") as SupportedLanguage;

  return (
    <Select value={current} onValueChange={(v) => setLanguage(v as SupportedLanguage)}>
      <SelectTrigger
        className={compact ? "h-9 w-[140px]" : "w-full"}
        aria-label="Language"
      >
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 opacity-70" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            <span className="mr-2">{l.flag}</span>
            {l.nativeLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
