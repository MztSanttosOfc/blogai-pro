import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Camera,
  Loader2,
  Mail,
  KeyRound,
  Globe,
  Search,
  Newspaper,
  Trash2,
  CheckCircle2,
  Clock,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES, setLanguage } from "@/i18n";
import { PLAN_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/meu-perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — BlogAI Pro" },
      { name: "description", content: "Gerencie os dados pessoais da sua conta BlogAI Pro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyProfilePage,
});

const COUNTRIES = [
  "Brasil",
  "Portugal",
  "Estados Unidos",
  "Reino Unido",
  "Espanha",
  "México",
  "Argentina",
  "França",
  "Alemanha",
  "Japão",
  "Outro",
];

function guessTimezones(): string[] {
  const base = [
    "America/Sao_Paulo",
    "America/New_York",
    "America/Los_Angeles",
    "America/Mexico_City",
    "America/Buenos_Aires",
    "Europe/Lisbon",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "UTC",
  ];
  try {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (local && !base.includes(local)) base.unshift(local);
  } catch {
    /* ignore */
  }
  return base;
}

function MyProfilePage() {
  const { t } = useTranslation("profile");
  const { profile, user, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [locale, setLocale] = useState("pt-BR");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [bloggerConnected, setBloggerConnected] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<{
    status: string;
    current_period_end: string | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timezones = useMemo(() => guessTimezones(), []);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setDisplayName(profile.display_name ?? "");
    setBirthDate(profile.birth_date ?? "");
    setCountry(profile.country ?? "");
    setTimezone(profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    setLocale(profile.locale ?? "pt-BR");
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: bc }, { data: sub }] = await Promise.all([
        supabase.from("blogger_connections").select("id").maybeSingle(),
        supabase
          .from("subscriptions")
          .select("status, current_period_end")
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setBloggerConnected(!!bc);
      setSubscription((sub as { status: string; current_period_end: string | null } | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const isUnlimited = profile?.plan === "premium";
  const initials = (profile?.display_name ?? profile?.full_name ?? user?.email ?? "U").charAt(0).toUpperCase();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          display_name: displayName.trim() || null,
          birth_date: birthDate || null,
          country: country || null,
          timezone: timezone || null,
          locale,
        })
        .eq("id", user.id);
      if (error) throw error;
      if (locale === "pt-BR" || locale === "en-US") setLanguage(locale);
      await refreshProfile();
      toast.success(t("fields.saved"));
    } catch (e) {
      toast.error(t("fields.saveError"), { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(t("avatar.invalidType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("avatar.tooLarge"));
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      // Signed URL valid for ~1 year (avatars bucket is private).
      const { data: signed, error: sErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw sErr ?? new Error("signed_url_failed");
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: signed.signedUrl })
        .eq("id", user.id);
      if (updErr) throw updErr;
      await refreshProfile();
      toast.success(t("avatar.success"));
    } catch (e) {
      toast.error(t("avatar.error"), { description: (e as Error).message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(t("avatar.removed"));
    } catch (e) {
      toast.error(t("avatar.error"), { description: (e as Error).message });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error(t("security.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("security.passwordMismatch"));
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("security.passwordUpdated"));
    } catch (e) {
      toast.error(t("security.updateError"), { description: (e as Error).message });
    } finally {
      setPwLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setNewEmail("");
      toast.success(t("security.emailUpdated"));
    } catch (e) {
      toast.error(t("security.updateError"), { description: (e as Error).message });
    } finally {
      setEmailLoading(false);
    }
  };

  const dateFmt = (v?: string | null) => {
    if (!v) return "—";
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(v));
    } catch {
      return v;
    }
  };

  const subStatusLabel = (status?: string | null) => {
    switch (status) {
      case "active":
        return t("account.statusActive");
      case "trialing":
        return t("account.statusTrialing");
      case "canceled":
        return t("account.statusCanceled");
      default:
        return t("account.statusInactive");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* Summary card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
            <div className="relative">
              <UserAvatar
                src={profile?.avatar_url}
                name={profile?.display_name ?? profile?.full_name}
                email={user?.email}
                className="h-24 w-24 text-xl"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label={t("avatar.change")}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background transition hover:scale-105 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
            </div>
            <div className="flex-1 space-y-1 text-center md:text-left">
              <h2 className="text-2xl font-semibold">
                {profile?.display_name ?? profile?.full_name ?? initials}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 md:justify-start">
                <Badge variant="secondary" className="gap-1">
                  {PLAN_LABELS[profile?.plan ?? "free"]}
                </Badge>
                <Badge variant="outline">
                  {isUnlimited ? t("account.unlimited") : `${profile?.credits ?? 0} ${t("account.credits").toLowerCase()}`}
                </Badge>
                {profile?.avatar_url && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs text-muted-foreground"
                    onClick={handleRemoveAvatar}
                  >
                    <Trash2 className="h-3 w-3" />
                    {t("avatar.remove")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account">{t("tabs.account")}</TabsTrigger>
          <TabsTrigger value="security">{t("tabs.security")}</TabsTrigger>
          <TabsTrigger value="integrations">{t("tabs.integrations")}</TabsTrigger>
        </TabsList>

        {/* Account tab */}
        <TabsContent value="account" className="space-y-6">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{t("account.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("account.description")}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("fields.fullName")}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">{t("fields.displayName")}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">{t("fields.displayNameHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("fields.email")}</Label>
                <Input id="email" value={user?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">{t("fields.birthDate")}</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("fields.birthDateHint")}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.language")}</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lng) => (
                      <SelectItem key={lng.code} value={lng.code}>
                        {lng.flag} {lng.nativeLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.country")}</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("fields.timezone")}</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={saving} variant="hero">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("fields.saving")}
                  </>
                ) : (
                  t("fields.save")
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold">{t("account.summaryTitle")}</h3>
            <Separator className="my-4" />
            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("account.plan")}
                </dt>
                <dd className="mt-1 font-medium">{PLAN_LABELS[profile?.plan ?? "free"]}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("account.credits")}
                </dt>
                <dd className="mt-1 font-medium">
                  {isUnlimited ? t("account.unlimited") : (profile?.credits ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("account.memberSince")}
                </dt>
                <dd className="mt-1 font-medium">{dateFmt(profile?.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("account.lastAccess")}
                </dt>
                <dd className="mt-1 font-medium">
                  {dateFmt(user?.last_sign_in_at ?? profile?.last_sign_in_at)}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("account.subscriptionStatus")}
                </dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                  <Badge variant={subscription?.status === "active" ? "default" : "secondary"}>
                    {subStatusLabel(subscription?.status ?? (isUnlimited ? "active" : "inactive"))}
                  </Badge>
                  {subscription?.current_period_end && (
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {t("account.renewsOn", { date: dateFmt(subscription.current_period_end) })}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </Card>
        </TabsContent>

        {/* Security tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{t("security.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("security.description")}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium">
                  <KeyRound className="h-4 w-4 text-primary" />
                  {t("security.changePassword")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPw">{t("security.newPassword")}</Label>
                  <Input
                    id="newPw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPw">{t("security.confirmPassword")}</Label>
                  <Input
                    id="confirmPw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={pwLoading || !newPassword}
                  className="w-full"
                >
                  {pwLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t("security.changePassword")}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium">
                  <Mail className="h-4 w-4 text-primary" />
                  {t("security.changeEmail")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newEmail">{t("security.newEmail")}</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <Button
                  onClick={handleChangeEmail}
                  disabled={emailLoading || !newEmail}
                  variant="secondary"
                  className="w-full"
                >
                  {emailLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t("security.changeEmail")}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Integrations tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{t("integrations.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("integrations.description")}</p>
            </div>
            <div className="grid gap-3">
              <IntegrationRow
                icon={<Globe className="h-5 w-5" />}
                title={t("integrations.blogger")}
                description={t("integrations.bloggerDesc")}
                status={
                  bloggerConnected === null
                    ? "loading"
                    : bloggerConnected
                      ? "connected"
                      : "disconnected"
                }
                connectedLabel={t("integrations.connected")}
                disconnectedLabel={t("integrations.disconnected")}
                manageHref="/connections"
                manageLabel={t("integrations.manage")}
              />
              <IntegrationRow
                icon={<Search className="h-5 w-5" />}
                title={t("integrations.gsc")}
                description={t("integrations.gscDesc")}
                status={
                  bloggerConnected === null
                    ? "loading"
                    : bloggerConnected
                      ? "connected"
                      : "disconnected"
                }
                connectedLabel={t("integrations.connected")}
                disconnectedLabel={t("integrations.disconnected")}
                manageHref="/desempenho"
                manageLabel={t("integrations.manage")}
              />
              <IntegrationRow
                icon={<Newspaper className="h-5 w-5" />}
                title={t("integrations.wordpress")}
                description={t("integrations.wordpressDesc")}
                status="coming-soon"
                connectedLabel={t("integrations.connected")}
                disconnectedLabel={t("integrations.comingSoon")}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntegrationRow({
  icon,
  title,
  description,
  status,
  connectedLabel,
  disconnectedLabel,
  manageHref,
  manageLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "connected" | "disconnected" | "loading" | "coming-soon";
  connectedLabel: string;
  disconnectedLabel: string;
  manageHref?: string;
  manageLabel?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        {status === "connected" && (
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            {connectedLabel}
          </Badge>
        )}
        {status === "disconnected" && <Badge variant="outline">{disconnectedLabel}</Badge>}
        {status === "loading" && (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
          </Badge>
        )}
        {status === "coming-soon" && <Badge variant="secondary">{disconnectedLabel}</Badge>}
        {manageHref && manageLabel && status !== "coming-soon" && (
          <Button asChild size="sm" variant="ghost">
            <a href={manageHref}>{manageLabel}</a>
          </Button>
        )}
      </div>
    </div>
  );
}
