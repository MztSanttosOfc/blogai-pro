import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Printer, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LegalDoc } from "@/lib/legal-content";

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation("legal");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/legal">
            <ArrowLeft className="h-4 w-4" />
            {t("nav.back")}
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 print:hidden"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          {t("nav.print")}
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="overflow-hidden border-border/60">
          <div className="relative bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <ScrollText className="h-6 w-6" />
              </div>
              <div className="min-w-0 space-y-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{doc.title}</h1>
                <p className="text-sm text-muted-foreground sm:text-base">{doc.subtitle}</p>
                <Badge variant="outline" className="gap-1 font-normal">
                  <CalendarClock className="h-3 w-3" />
                  {t("nav.updated")} {doc.updatedLabel}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-20 space-y-2 rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("nav.toc")}
            </p>
            <nav aria-label={t("nav.toc")} className="space-y-1">
              {doc.sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block truncate rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <Card className="p-6 sm:p-8">
          <article className="space-y-8">
            {doc.sections.map((section, index) => (
              <motion.section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 space-y-3"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
                {section.paragraphs?.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="space-y-2">
                    {section.bullets.map((b, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {index < doc.sections.length - 1 && <Separator className="!mt-8" />}
              </motion.section>
            ))}
          </article>
        </Card>
      </div>
    </div>
  );
}
