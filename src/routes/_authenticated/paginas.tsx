import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  Sparkles,
  Save,
  Send,
  RefreshCw,
  Trash2,
  Settings2,
  Rocket,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  getSiteSettings,
  saveSiteSettings,
  listSitePages,
  generateSitePage,
  generateAdsenseKit,
  saveSitePage,
  deleteSitePage,
  publishSitePageToBlogger,
  PAGE_TYPES,
  PAGE_TITLES,
  type SitePageType,
} from "@/lib/pages.functions";

export const Route = createFileRoute("/_authenticated/paginas")({
  component: PaginasPage,
});

interface SitePageRow {
  id: string;
  type: SitePageType;
  title: string;
  content: string;
  status: "draft" | "published";
  blogger_post_url: string | null;
}

function PaginasPage() {
  const { t } = useTranslation("pages");
  const queryClient = useQueryClient();

  const fetchSettings = useServerFn(getSiteSettings);
  const fetchPages = useServerFn(listSitePages);
  const runSaveSettings = useServerFn(saveSiteSettings);
  const runGenerate = useServerFn(generateSitePage);
  const runKit = useServerFn(generateAdsenseKit);
  const runSavePage = useServerFn(saveSitePage);
  const runDelete = useServerFn(deleteSitePage);
  const runPublish = useServerFn(publishSitePageToBlogger);

  const settingsQuery = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => fetchSettings(),
  });
  const pagesQuery = useQuery({
    queryKey: ["site-pages"],
    queryFn: () => fetchPages(),
  });

  const [settings, setSettings] = useState({
    blog_name: "",
    owner_name: "",
    contact_email: "",
    domain: "",
    niche: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [kitLoading, setKitLoading] = useState(false);
  const [busyType, setBusyType] = useState<SitePageType | null>(null);
  const [selectedType, setSelectedType] = useState<SitePageType | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [savingPage, setSavingPage] = useState(false);
  const [publishingType, setPublishingType] = useState<SitePageType | null>(null);

  useEffect(() => {
    if (settingsQuery.data?.settings) {
      setSettings(settingsQuery.data.settings);
    }
  }, [settingsQuery.data]);

  const pages = useMemo<SitePageRow[]>(
    () => (pagesQuery.data?.pages as SitePageRow[]) ?? [],
    [pagesQuery.data],
  );
  const pageByType = useMemo(() => {
    const map = new Map<SitePageType, SitePageRow>();
    for (const p of pages) map.set(p.type, p);
    return map;
  }, [pages]);

  const selectPage = (type: SitePageType) => {
    const page = pageByType.get(type);
    if (!page) return;
    setSelectedType(type);
    setEditorTitle(page.title);
    setEditorContent(page.content);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await runSaveSettings({ data: settings });
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success(t("settings.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.saveError"));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleGenerate = async (type: SitePageType) => {
    setBusyType(type);
    try {
      const res = await runGenerate({ data: { type } });
      await queryClient.invalidateQueries({ queryKey: ["site-pages"] });
      toast.success(t("toasts.generated", { page: PAGE_TITLES[type] }));
      const page = res.page as SitePageRow;
      setSelectedType(type);
      setEditorTitle(page.title);
      setEditorContent(page.content);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.generateError"));
    } finally {
      setBusyType(null);
    }
  };

  const handleKit = async () => {
    setKitLoading(true);
    try {
      await runKit();
      await queryClient.invalidateQueries({ queryKey: ["site-pages"] });
      toast.success(t("kit.success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("kit.error"));
    } finally {
      setKitLoading(false);
    }
  };

  const handleSavePage = async () => {
    if (!selectedType) return;
    setSavingPage(true);
    try {
      await runSavePage({
        data: {
          type: selectedType,
          title: editorTitle.trim() || PAGE_TITLES[selectedType],
          content: editorContent,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["site-pages"] });
      toast.success(t("toasts.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.saveError"));
    } finally {
      setSavingPage(false);
    }
  };

  const handlePublish = async (type: SitePageType) => {
    setPublishingType(type);
    try {
      const res = await runPublish({ data: { type } });
      await queryClient.invalidateQueries({ queryKey: ["site-pages"] });
      toast.success(`${t("toasts.published")}${res.blogName ? ` (${res.blogName})` : ""}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.publishError"));
    } finally {
      setPublishingType(null);
    }
  };

  const handleDelete = async (type: SitePageType) => {
    setBusyType(type);
    try {
      await runDelete({ data: { type } });
      await queryClient.invalidateQueries({ queryKey: ["site-pages"] });
      if (selectedType === type) setSelectedType(null);
      toast.success(t("toasts.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.deleteError"));
    } finally {
      setBusyType(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <FileText className="h-6 w-6 text-primary" /> {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="space-y-4 p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("settings.title")}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blog_name">{t("settings.blogName")}</Label>
            <Input
              id="blog_name"
              value={settings.blog_name}
              maxLength={160}
              placeholder={t("settings.blogNamePh")}
              onChange={(e) => setSettings((s) => ({ ...s, blog_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_name">{t("settings.ownerName")}</Label>
            <Input
              id="owner_name"
              value={settings.owner_name}
              maxLength={160}
              placeholder={t("settings.ownerNamePh")}
              onChange={(e) => setSettings((s) => ({ ...s, owner_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">{t("settings.contactEmail")}</Label>
            <Input
              id="contact_email"
              type="email"
              value={settings.contact_email}
              maxLength={160}
              placeholder={t("settings.contactEmailPh")}
              onChange={(e) => setSettings((s) => ({ ...s, contact_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">{t("settings.domain")}</Label>
            <Input
              id="domain"
              value={settings.domain}
              maxLength={200}
              placeholder={t("settings.domainPh")}
              onChange={(e) => setSettings((s) => ({ ...s, domain: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="niche">{t("settings.niche")}</Label>
            <Input
              id="niche"
              value={settings.niche}
              maxLength={200}
              placeholder={t("settings.nichePh")}
              onChange={(e) => setSettings((s) => ({ ...s, niche: e.target.value }))}
            />
          </div>
        </div>
        <Button onClick={handleSaveSettings} disabled={savingSettings} variant="secondary">
          {savingSettings ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("settings.save")}
        </Button>
      </Card>

      <Card className="flex flex-col items-start justify-between gap-4 bg-gradient-primary p-6 text-primary-foreground shadow-glow sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Rocket className="h-5 w-5" /> {t("kit.title")}
          </h2>
          <p className="text-sm opacity-90">{t("kit.subtitle")}</p>
        </div>
        <Button
          onClick={handleKit}
          disabled={kitLoading}
          className="bg-card text-foreground hover:bg-card/90"
        >
          {kitLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {kitLoading ? t("kit.loading") : t("kit.cta")}
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PAGE_TYPES.map((type) => {
          const page = pageByType.get(type);
          const busy = busyType === type;
          const publishing = publishingType === type;
          return (
            <Card key={type} className="flex flex-col gap-3 p-5 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{PAGE_TITLES[type]}</h3>
                  <p className="text-xs text-muted-foreground">{t(`descriptions.${type}`)}</p>
                </div>
                {page ? (
                  page.status === "published" ? (
                    <Badge className="bg-success text-success-foreground">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> {t("status.published")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t("status.draft")}</Badge>
                  )
                ) : (
                  <Badge variant="outline">{t("status.notCreated")}</Badge>
                )}
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                <Button size="sm" onClick={() => handleGenerate(type)} disabled={busy}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : page ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {page ? t("actions.regenerate") : t("actions.generate")}
                </Button>
                {page && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => selectPage(type)}>
                      <Pencil className="h-4 w-4" /> {t("actions.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePublish(type)}
                      disabled={publishing}
                    >
                      {publishing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {page.status === "published" ? t("actions.update") : t("actions.publish")}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(type)}
                      disabled={busy}
                      aria-label={t("actions.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {page?.blogger_post_url && (
                  <a
                    href={page.blogger_post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-center text-xs text-primary underline"
                  >
                    {t("actions.seeOnBlog")}
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {selectedType && (
        <Card className="space-y-4 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Pencil className="h-5 w-5 text-primary" /> {t("editor.title")}{" "}
              {PAGE_TITLES[selectedType]}
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setSelectedType(null)}>
              {t("actions.close")}
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="editor_title">{t("editor.pageTitle")}</Label>
            <Input
              id="editor_title"
              value={editorTitle}
              maxLength={200}
              onChange={(e) => setEditorTitle(e.target.value)}
            />
          </div>
          <RichTextEditor value={editorContent} onChange={setEditorContent} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSavePage} disabled={savingPage}>
              {savingPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("actions.save")}
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePublish(selectedType)}
              disabled={publishingType === selectedType}
            >
              {publishingType === selectedType ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("actions.publishToBlogger")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
