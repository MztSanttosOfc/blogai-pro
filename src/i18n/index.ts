// BlogAI Pro — v1.1 Internacionalização (i18n)
// Arquitetura preparada para novos idiomas: basta adicionar um bundle em locales/<code>
// e registrá-lo em SUPPORTED_LANGUAGES.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ptBrCommon from "./locales/pt-BR/common.json";
import enUsCommon from "./locales/en-US/common.json";

export type SupportedLanguage = "pt-BR" | "en-US";

export const SUPPORTED_LANGUAGES: {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}[] = [
  { code: "pt-BR", label: "Portuguese (Brazil)", nativeLabel: "Português (Brasil)", flag: "🇧🇷" },
  { code: "en-US", label: "English (US)", nativeLabel: "English (US)", flag: "🇺🇸" },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = "pt-BR";
export const LANGUAGE_STORAGE_KEY = "blogai_pro_lang";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        "pt-BR": { common: ptBrCommon },
        "en-US": { common: enUsCommon },
      },
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
      ns: ["common"],
      defaultNS: "common",
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        caches: ["localStorage"],
      },
      react: { useSuspense: false },
    });
}

export function setLanguage(code: SupportedLanguage): void {
  void i18n.changeLanguage(code);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    document.documentElement.lang = code;
  } catch {
    /* ignore */
  }
}

export default i18n;
