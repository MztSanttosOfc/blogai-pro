import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";

export function DeleteAccountCard({ email }: { email?: string | null }) {
  const { t } = useTranslation("legal");
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmWord = t("delete.confirmWord");
  const items = t("delete.willRemove", { returnObjects: true }) as string[];

  const handleDelete = async () => {
    if (word.trim().toUpperCase() !== confirmWord.toUpperCase()) {
      toast.error(t("delete.wrongWord"));
      return;
    }
    setLoading(true);
    try {
      if (password && email) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(t("delete.wrongPassword"));
          return;
        }
      }
      await deleteMyAccount({ data: { confirm: true } });
      toast.success(t("delete.success"));
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch {
      toast.error(t("delete.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-destructive/40 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-semibold">{t("delete.title")}</h3>
            <p className="text-sm text-muted-foreground">{t("delete.description")}</p>
          </div>
          <Button variant="destructive" className="gap-2" onClick={() => setOpen(true)}>
            <Trash2 className="h-4 w-4" />
            {t("delete.trigger")}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>{t("delete.description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="mb-2 text-sm font-medium">{t("delete.willRemoveTitle")}</p>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">{t("delete.keepNote")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="del-pw">{t("delete.confirmPasswordLabel")}</Label>
              <Input
                id="del-pw"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("delete.confirmPasswordHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="del-word">{t("delete.confirmTextLabel")}</Label>
              <Input
                id="del-word"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder={confirmWord}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {t("delete.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? t("delete.deleting") : t("delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
