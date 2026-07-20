// BlogAI Pro — v1.1 Smart Profile: server-only helpers.
// Fonte única de verdade para injetar dados do usuário nos prompts de IA.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface SmartProfileFeatureFlags {
  useInArticles?: boolean;
  useInPages?: boolean;
  useInFaqs?: boolean;
  useSignature?: boolean;
  useSocialLinks?: boolean;
}

export interface SmartProfilePersonal {
  full_name?: string;
  author_name?: string;
  bio?: string;
  role?: string;
  company?: string;
  city?: string;
  country?: string;
  primary_language?: string;
}

export interface SmartProfileContacts {
  email?: string;
  whatsapp?: string;
  phone?: string;
  website?: string;
}

export interface SmartProfileSocial {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  pinterest?: string;
  linkedin?: string;
  telegram?: string;
  github?: string;
  twitter?: string;
  other?: string;
}

export interface SmartProfileBlogger {
  main_url?: string;
  niche?: string;
  audience?: string;
}

export interface SmartProfileSeo {
  primary_keywords?: string[];
  banned_words?: string[];
  writing_style?: string;
  tone_of_voice?: string;
}

export interface SmartProfileAi {
  preferred_word_count?: number;
  preferred_structure?: string;
  default_headings?: number;
  default_language?: string;
  preferred_image_style?: string;
}

export interface SmartProfileLink {
  label: string;
  url: string;
}

export interface SmartProfileFull {
  user_id: string;
  personal: SmartProfilePersonal;
  contacts: SmartProfileContacts;
  social_links: SmartProfileSocial;
  blogger: SmartProfileBlogger;
  seo_prefs: SmartProfileSeo;
  ai_prefs: SmartProfileAi;
  default_links: SmartProfileLink[];
  signature: string | null;
  feature_flags: SmartProfileFeatureFlags;
  created_at?: string;
  updated_at?: string;
}

const EMPTY: Omit<SmartProfileFull, "user_id" | "created_at" | "updated_at"> = {
  personal: {},
  contacts: {},
  social_links: {},
  blogger: {},
  seo_prefs: {},
  ai_prefs: {},
  default_links: [],
  signature: null,
  feature_flags: {
    useInArticles: true,
    useInPages: true,
    useInFaqs: true,
    useSignature: false,
    useSocialLinks: true,
  },
};

type Client = SupabaseClient<Database>;

/**
 * Loads the smart profile for a user. Returns a fully-populated object
 * with sensible defaults if the row does not exist yet.
 */
export async function loadSmartProfile(
  supabase: Client,
  userId: string,
): Promise<SmartProfileFull> {
  const { data, error } = await (supabase.from("user_smart_profile") as any)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return { user_id: userId, ...EMPTY };
  }
  return {
    user_id: userId,
    personal: (data.personal ?? {}) as SmartProfilePersonal,
    contacts: (data.contacts ?? {}) as SmartProfileContacts,
    social_links: (data.social_links ?? {}) as SmartProfileSocial,
    blogger: (data.blogger ?? {}) as SmartProfileBlogger,
    seo_prefs: (data.seo_prefs ?? {}) as SmartProfileSeo,
    ai_prefs: (data.ai_prefs ?? {}) as SmartProfileAi,
    default_links: (data.default_links ?? []) as SmartProfileLink[],
    signature: data.signature ?? null,
    feature_flags: { ...EMPTY.feature_flags, ...(data.feature_flags ?? {}) },
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export interface SmartProfileUpsert {
  personal?: SmartProfilePersonal;
  contacts?: SmartProfileContacts;
  social_links?: SmartProfileSocial;
  blogger?: SmartProfileBlogger;
  seo_prefs?: SmartProfileSeo;
  ai_prefs?: SmartProfileAi;
  default_links?: SmartProfileLink[];
  signature?: string | null;
  feature_flags?: SmartProfileFeatureFlags;
}

export async function saveSmartProfile(
  supabase: Client,
  userId: string,
  patch: SmartProfileUpsert,
): Promise<SmartProfileFull> {
  const payload: Record<string, unknown> = { user_id: userId };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) payload[k] = v;
  }
  const { error } = await (supabase.from("user_smart_profile") as any).upsert(payload, {
    onConflict: "user_id",
  });
  if (error) throw new Error(error.message);
  return loadSmartProfile(supabase, userId);
}

/**
 * Compiles a plain-text context block ready to be embedded into any
 * AI prompt (articles, pages, FAQs, bios, policies). Respects
 * feature_flags — nothing is injected when disabled.
 *
 * Callers (article/page generators) opt in by concatenating the returned
 * string to their system prompt. Empty string means "no context to add".
 */
export function buildSmartProfilePromptContext(
  profile: SmartProfileFull,
  surface: "article" | "page" | "faq" | "bio" | "policy" = "article",
): string {
  const flags = profile.feature_flags;
  const enabled =
    (surface === "article" && flags.useInArticles) ||
    (surface === "page" && flags.useInPages) ||
    (surface === "faq" && flags.useInFaqs) ||
    surface === "bio" ||
    surface === "policy";
  if (!enabled) return "";

  const lines: string[] = [];
  const p = profile.personal;
  if (p.author_name || p.full_name) {
    lines.push(`Autor: ${p.author_name ?? p.full_name}`);
  }
  if (p.bio) lines.push(`Sobre o autor: ${p.bio}`);
  if (p.role) lines.push(`Cargo: ${p.role}`);
  if (p.company) lines.push(`Empresa: ${p.company}`);
  if (p.city || p.country) {
    lines.push(`Local: ${[p.city, p.country].filter(Boolean).join(", ")}`);
  }

  const b = profile.blogger;
  if (b.niche) lines.push(`Nicho: ${b.niche}`);
  if (b.audience) lines.push(`Público-alvo: ${b.audience}`);
  if (b.main_url) lines.push(`Blog oficial: ${b.main_url}`);

  const seo = profile.seo_prefs;
  if (seo.tone_of_voice) lines.push(`Tom de voz: ${seo.tone_of_voice}`);
  if (seo.writing_style) lines.push(`Estilo de escrita: ${seo.writing_style}`);
  if (seo.primary_keywords?.length) {
    lines.push(`Palavras-chave centrais: ${seo.primary_keywords.join(", ")}`);
  }
  if (seo.banned_words?.length) {
    lines.push(`Nunca use estas palavras: ${seo.banned_words.join(", ")}`);
  }

  if (flags.useSocialLinks) {
    const socials = Object.entries(profile.social_links)
      .filter(([, v]) => typeof v === "string" && v)
      .map(([k, v]) => `${k}: ${v}`);
    if (socials.length) lines.push(`Redes sociais oficiais: ${socials.join(" | ")}`);
  }

  if (flags.useSignature && profile.signature) {
    lines.push(`Adicione ao final: "${profile.signature}"`);
  }

  if (!lines.length) return "";
  return `\n\n[Perfil do autor — use estes dados de forma natural, sem forçar]\n${lines.join(
    "\n",
  )}\n`;
}
