import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/BrandLogo";
import { Link } from "@tanstack/react-router";
import { Github, Twitter, Instagram, Mail, Globe } from "lucide-react";
import { APP_INFO } from "@/lib/app-info";

export function Footer() {
  const { t } = useTranslation("landing");
  const year = new Date().getFullYear();

  return (
    <footer className="pt-24 pb-12 border-t border-white/5 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-emerald-500/5 blur-[120px] -z-10" />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 lg:col-span-1">
            <BrandLogo className="mb-6" />
            <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-xs">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-400 transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-400 transition-all">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-400 transition-all">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">{t("footer.product")}</h4>
            <ul className="space-y-4">
              {["features", "pricing", "changelog"].map(item => (
                <li key={item}>
                  <Link to="/" className="text-muted-foreground hover:text-emerald-400 transition-colors text-sm">
                    {t(`footer.links.${item}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">{t("footer.resources")}</h4>
            <ul className="space-y-4">
              {["help", "api", "creator", "contact"].map(item => (
                <li key={item}>
                  <Link to="/" className="text-muted-foreground hover:text-emerald-400 transition-colors text-sm">
                    {t(`footer.links.${item}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">{t("footer.legal")}</h4>
            <ul className="space-y-4">
              {["privacy", "terms"].map(item => (
                <li key={item}>
                  <Link to={`/legal/${item === "privacy" ? "privacidade" : "termos"}`} className="text-muted-foreground hover:text-emerald-400 transition-colors text-sm">
                    {t(`footer.links.${item}`)}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-8 border-t border-white/5">
              <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-tighter">
                <Globe className="w-3 h-3" /> System Status
              </div>
              <div className="mt-2 flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-muted-foreground/40 text-xs">
            © {year} {APP_INFO.developerFull}. {t("footer.rights")}
          </div>
          <div className="flex items-center gap-6">
            <div className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">
              V{APP_INFO.version} Stable
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
