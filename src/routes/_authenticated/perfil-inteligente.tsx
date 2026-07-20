// BlogAI Pro — v1.1 Perfil Inteligente Global
// Central única de dados do usuário. A IA usa automaticamente conforme feature flags.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  User,
  Contact,
  Share2,
  Globe,
  Search,
  Sparkles,
  Link2,
  PenLine,
  ToggleRight,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getSmartProfile, updateSmartProfile } from "@/lib/smart-profile.functions";
import type { SmartProfileFull } from "@/lib/smart-profile.server";

export const Route = createFileRoute("/_authenticated/perfil-inteligente")({
  head: () => ({
    meta: [
      { title: "Perfil Inteligente — BlogAI Pro" },
      {
        name: "description",
        content:
          "Central única de dados do usuário. Preencha uma vez e a IA usa automaticamente em todos os conteúdos.",
      },
    ],
  }),
  component: SmartProfilePage,
});

function SmartProfilePage() {
  const { t } = useTranslation();
  const load = useServerFn(getSmartProfile);
  const save = useServerFn(updateSmartProfile);

  const [state, setState] = useState<SmartProfileFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profile = await load({ data: undefined as never });
        setState(profile);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("smartProfile.loadError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [load, t]);

  const patch = <K extends keyof SmartProfileFull>(key: K, val: SmartProfileFull[K]) => {
    setState((s) => (s ? { ...s, [key]: val } : s));
  };

  const patchIn = <K extends keyof SmartProfileFull>(key: K, field: string, val: unknown) => {
    setState((s) => {
      if (!s) return s;
      const current = (s[key] ?? {}) as Record<string, unknown>;
      return { ...s, [key]: { ...current, [field]: val } };
    });
  };

  const handleSave = async () => {
    if (!state) return;
    setSaving(true);
    try {
      const next = await save({
        data: {
          personal: state.personal,
          contacts: state.contacts,
          social_links: state.social_links,
          blogger: state.blogger,
          seo_prefs: state.seo_prefs,
          ai_prefs: state.ai_prefs,
          default_links: state.default_links,
          signature: state.signature,
          feature_flags: state.feature_flags,
        },
      });
      setState(next);
      toast.success(t("smartProfile.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("smartProfile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !state) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const csv = (v?: string[]) => (v ? v.join(", ") : "");
  const parseCsv = (v: string) =>
    v
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <Sparkles className="h-6 w-6 text-primary" /> {t("smartProfile.title")}
        </h1>
        <p className="text-muted-foreground">{t("smartProfile.subtitle")}</p>
      </div>

      <Tabs defaultValue="personal" className="w-full space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 md:grid-cols-6">
          <TabsTrigger value="personal" className="h-9 gap-1.5">
            <User className="h-4 w-4" />
            <span className="hidden md:inline">{t("smartProfile.sections.personal")}</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="h-9 gap-1.5">
            <Contact className="h-4 w-4" />
            <span className="hidden md:inline">{t("smartProfile.sections.contacts")}</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="h-9 gap-1.5">
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">{t("smartProfile.sections.social")}</span>
          </TabsTrigger>
          <TabsTrigger value="blogger" className="h-9 gap-1.5">
            <Globe className="h-4 w-4" />
            <span className="hidden md:inline">{t("smartProfile.sections.blogger")}</span>
          </TabsTrigger>
          <TabsTrigger value="seo-ai" className="h-9 gap-1.5">
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">SEO / IA</span>
          </TabsTrigger>
          <TabsTrigger value="signature" className="h-9 gap-1.5">
            <PenLine className="h-4 w-4" />
            <span className="hidden md:inline">{t("smartProfile.sections.signature")}</span>
          </TabsTrigger>
        </TabsList>


        {/* PERSONAL */}
        <TabsContent value="personal">
          <Card className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label={t("smartProfile.fields.fullName")}>
              <Input
                value={state.personal.full_name ?? ""}
                onChange={(e) => patchIn("personal", "full_name", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label={t("smartProfile.fields.authorName")}>
              <Input
                value={state.personal.author_name ?? ""}
                onChange={(e) => patchIn("personal", "author_name", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label={t("smartProfile.fields.bio")} full>
              <Textarea
                rows={3}
                value={state.personal.bio ?? ""}
                onChange={(e) => patchIn("personal", "bio", e.target.value)}
                maxLength={400}
              />
            </Field>
            <Field label={t("smartProfile.fields.role")}>
              <Input
                value={state.personal.role ?? ""}
                onChange={(e) => patchIn("personal", "role", e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field label={t("smartProfile.fields.company")}>
              <Input
                value={state.personal.company ?? ""}
                onChange={(e) => patchIn("personal", "company", e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field label={t("smartProfile.fields.city")}>
              <Input
                value={state.personal.city ?? ""}
                onChange={(e) => patchIn("personal", "city", e.target.value)}
                maxLength={60}
              />
            </Field>
            <Field label={t("smartProfile.fields.country")}>
              <Input
                value={state.personal.country ?? ""}
                onChange={(e) => patchIn("personal", "country", e.target.value)}
                maxLength={60}
              />
            </Field>
            <Field label={t("smartProfile.fields.primaryLanguage")}>
              <Input
                value={state.personal.primary_language ?? ""}
                onChange={(e) => patchIn("personal", "primary_language", e.target.value)}
                placeholder="pt-BR"
                maxLength={12}
              />
            </Field>
          </Card>
        </TabsContent>

        {/* CONTACTS */}
        <TabsContent value="contacts">
          <Card className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label={t("smartProfile.fields.email")}>
              <Input
                type="email"
                value={state.contacts.email ?? ""}
                onChange={(e) => patchIn("contacts", "email", e.target.value)}
                maxLength={160}
              />
            </Field>
            <Field label={t("smartProfile.fields.whatsapp")}>
              <Input
                value={state.contacts.whatsapp ?? ""}
                onChange={(e) => patchIn("contacts", "whatsapp", e.target.value)}
                maxLength={40}
              />
            </Field>
            <Field label={t("smartProfile.fields.phone")}>
              <Input
                value={state.contacts.phone ?? ""}
                onChange={(e) => patchIn("contacts", "phone", e.target.value)}
                maxLength={40}
              />
            </Field>
            <Field label={t("smartProfile.fields.website")}>
              <Input
                value={state.contacts.website ?? ""}
                onChange={(e) => patchIn("contacts", "website", e.target.value)}
                placeholder="https://"
                maxLength={240}
              />
            </Field>
          </Card>
        </TabsContent>

        {/* SOCIAL */}
        <TabsContent value="social">
          <Card className="grid gap-4 p-6 sm:grid-cols-2">
            {(
              [
                "facebook",
                "instagram",
                "youtube",
                "tiktok",
                "pinterest",
                "linkedin",
                "telegram",
                "github",
                "twitter",
                "other",
              ] as const
            ).map((k) => (
              <Field key={k} label={t(`smartProfile.fields.${k}`)}>
                <Input
                  value={(state.social_links[k] as string | undefined) ?? ""}
                  onChange={(e) => patchIn("social_links", k, e.target.value)}
                  placeholder="https://"
                  maxLength={240}
                />
              </Field>
            ))}
          </Card>
        </TabsContent>

        {/* BLOGGER */}
        <TabsContent value="blogger">
          <Card className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label={t("smartProfile.fields.bloggerUrl")} full>
              <Input
                value={state.blogger.main_url ?? ""}
                onChange={(e) => patchIn("blogger", "main_url", e.target.value)}
                placeholder="https://"
                maxLength={240}
              />
            </Field>
            <Field label={t("smartProfile.fields.niche")}>
              <Input
                value={state.blogger.niche ?? ""}
                onChange={(e) => patchIn("blogger", "niche", e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field label={t("smartProfile.fields.audience")}>
              <Input
                value={state.blogger.audience ?? ""}
                onChange={(e) => patchIn("blogger", "audience", e.target.value)}
                maxLength={200}
              />
            </Field>
          </Card>
        </TabsContent>

        {/* SEO / AI */}
        <TabsContent value="seo-ai">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <Search className="h-4 w-4 text-primary" /> {t("smartProfile.sections.seo")}
              </h3>
              <Field label={t("smartProfile.fields.primaryKeywords")} full>
                <Textarea
                  rows={2}
                  value={csv(state.seo_prefs.primary_keywords)}
                  onChange={(e) =>
                    patchIn("seo_prefs", "primary_keywords", parseCsv(e.target.value))
                  }
                  placeholder="Separadas por vírgula"
                />
              </Field>
              <Field label={t("smartProfile.fields.bannedWords")} full>
                <Textarea
                  rows={2}
                  value={csv(state.seo_prefs.banned_words)}
                  onChange={(e) => patchIn("seo_prefs", "banned_words", parseCsv(e.target.value))}
                  placeholder="Separadas por vírgula"
                />
              </Field>
              <Field label={t("smartProfile.fields.writingStyle")}>
                <Input
                  value={state.seo_prefs.writing_style ?? ""}
                  onChange={(e) => patchIn("seo_prefs", "writing_style", e.target.value)}
                  maxLength={80}
                />
              </Field>
              <Field label={t("smartProfile.fields.toneOfVoice")}>
                <Input
                  value={state.seo_prefs.tone_of_voice ?? ""}
                  onChange={(e) => patchIn("seo_prefs", "tone_of_voice", e.target.value)}
                  maxLength={80}
                />
              </Field>
            </Card>
            <Card className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> {t("smartProfile.sections.ai")}
              </h3>
              <Field label={t("smartProfile.fields.preferredWordCount")}>
                <Input
                  type="number"
                  min={200}
                  max={5000}
                  value={state.ai_prefs.preferred_word_count ?? ""}
                  onChange={(e) =>
                    patchIn("ai_prefs", "preferred_word_count", Number(e.target.value) || undefined)
                  }
                />
              </Field>
              <Field label={t("smartProfile.fields.defaultHeadings")}>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={state.ai_prefs.default_headings ?? ""}
                  onChange={(e) =>
                    patchIn("ai_prefs", "default_headings", Number(e.target.value) || undefined)
                  }
                />
              </Field>
              <Field label={t("smartProfile.fields.preferredStructure")}>
                <Input
                  value={state.ai_prefs.preferred_structure ?? ""}
                  onChange={(e) => patchIn("ai_prefs", "preferred_structure", e.target.value)}
                  maxLength={160}
                />
              </Field>
              <Field label={t("smartProfile.fields.defaultLanguage")}>
                <Input
                  value={state.ai_prefs.default_language ?? ""}
                  onChange={(e) => patchIn("ai_prefs", "default_language", e.target.value)}
                  placeholder="Português"
                  maxLength={40}
                />
              </Field>
              <Field label={t("smartProfile.fields.preferredImageStyle")}>
                <Input
                  value={state.ai_prefs.preferred_image_style ?? ""}
                  onChange={(e) => patchIn("ai_prefs", "preferred_image_style", e.target.value)}
                  placeholder="Normal"
                  maxLength={40}
                />
              </Field>
            </Card>
          </div>
        </TabsContent>

        {/* SIGNATURE + FLAGS */}
        <TabsContent value="signature">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-3 p-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <PenLine className="h-4 w-4 text-primary" /> {t("smartProfile.sections.signature")}
              </h3>
              <Textarea
                rows={4}
                value={state.signature ?? ""}
                onChange={(e) => patch("signature", e.target.value)}
                placeholder={t("smartProfile.fields.signatureExample")}
                maxLength={500}
              />
            </Card>
            <Card className="space-y-3 p-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <ToggleRight className="h-4 w-4 text-primary" /> {t("smartProfile.sections.flags")}
              </h3>
              {(
                [
                  "useInArticles",
                  "useInPages",
                  "useInFaqs",
                  "useSignature",
                  "useSocialLinks",
                ] as const
              ).map((f) => (
                <label
                  key={f}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 text-sm"
                >
                  <span>{t(`smartProfile.flags.${f}`)}</span>
                  <Switch
                    checked={!!state.feature_flags[f]}
                    onCheckedChange={(v) =>
                      patch("feature_flags", { ...state.feature_flags, [f]: v })
                    }
                  />
                </label>
              ))}
            </Card>
            <Card className="space-y-3 p-6 md:col-span-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <Link2 className="h-4 w-4 text-primary" /> {t("smartProfile.sections.links")}
              </h3>
              <p className="text-xs text-muted-foreground">
                Links reutilizáveis em geração de páginas e artigos. Reflete automaticamente no
                gerador quando ativado.
              </p>
              <DefaultLinksEditor
                value={state.default_links}
                onChange={(v) => patch("default_links", v)}
              />
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" variant="hero" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function DefaultLinksEditor({
  value,
  onChange,
}: {
  value: { label: string; url: string }[];
  onChange: (v: { label: string; url: string }[]) => void;
}) {
  const add = () => onChange([...value, { label: "", url: "" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, key: "label" | "url", v: string) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, [key]: v } : row)));

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]">
          <Input
            placeholder="Rótulo"
            value={row.label}
            onChange={(e) => update(i, "label", e.target.value)}
            maxLength={80}
          />
          <Input
            placeholder="https://"
            value={row.url}
            onChange={(e) => update(i, "url", e.target.value)}
            maxLength={500}
          />
          <Button variant="outline" size="sm" onClick={() => remove(i)}>
            Remover
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        + Adicionar link
      </Button>
    </div>
  );
}
