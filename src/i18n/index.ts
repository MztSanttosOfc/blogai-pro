// BlogAI Pro — v1.1 Internacionalização (i18n)
// Arquitetura preparada para novos idiomas: basta adicionar um bundle em locales/<code>
// e registrá-lo em SUPPORTED_LANGUAGES.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ptBrCommon from "./locales/pt-BR/common.json";
import enUsCommon from "./locales/en-US/common.json";
import ptBrDashboard from "./locales/pt-BR/dashboard.json";
import enUsDashboard from "./locales/en-US/dashboard.json";
import ptBrGenerate from "./locales/pt-BR/generate.json";
import enUsGenerate from "./locales/en-US/generate.json";
import ptBrPages from "./locales/pt-BR/pages.json";
import enUsPages from "./locales/en-US/pages.json";
import ptBrLibrary from "./locales/pt-BR/library.json";
import enUsLibrary from "./locales/en-US/library.json";
import ptBrPricing from "./locales/pt-BR/pricing.json";
import enUsPricing from "./locales/en-US/pricing.json";
import ptBrSettings from "./locales/pt-BR/settings.json";
import enUsSettings from "./locales/en-US/settings.json";
import ptBrCreator from "./locales/pt-BR/creator.json";
import enUsCreator from "./locales/en-US/creator.json";
import ptBrAdmin from "./locales/pt-BR/admin.json";
import enUsAdmin from "./locales/en-US/admin.json";
import ptBrFinance from "./locales/pt-BR/finance.json";
import enUsFinance from "./locales/en-US/finance.json";

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
        "pt-BR": {
          common: ptBrCommon,
          dashboard: ptBrDashboard,
          generate: ptBrGenerate,
          pages: ptBrPages,
          library: ptBrLibrary,
          pricing: ptBrPricing,
          settings: ptBrSettings,
          creator: ptBrCreator,
          admin: ptBrAdmin,
          finance: ptBrFinance,
        },
        "en-US": {
          common: enUsCommon,
          dashboard: enUsDashboard,
          generate: enUsGenerate,
          pages: enUsPages,
          library: enUsLibrary,
          pricing: enUsPricing,
          settings: enUsSettings,
          creator: enUsCreator,
          admin: enUsAdmin,
          finance: enUsFinance,
        },
      },
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
      ns: [
        "common",
        "dashboard",
        "generate",
        "pages",
        "library",
        "pricing",
        "settings",
        "creator",
        "admin",
      ],
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
