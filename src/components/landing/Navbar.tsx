import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/BrandLogo";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function Navbar() {
  const { t } = useTranslation("landing");
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setIsScrolled(latest > 50);
    });
  }, [scrollY]);

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 inset-x-0 z-[100] transition-all duration-300",
        isScrolled ? "py-4" : "py-6"
      )}
    >
      <div className="container mx-auto px-4">
        <div className={cn(
          "flex items-center justify-between px-6 py-3 rounded-full border transition-all duration-500 backdrop-blur-xl",
          isScrolled 
            ? "bg-black/40 border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.3)]" 
            : "bg-white/5 border-white/5"
        )}>
          <BrandLogo />
          
          <nav className="hidden lg:flex items-center gap-8">
            {["features", "how", "pricing", "faq"].map((item) => (
              <a 
                key={item}
                href={`#${item}`} 
                className="text-sm font-medium text-white/60 hover:text-emerald-400 transition-colors uppercase tracking-widest"
              >
                {t(`nav.${item}`)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button asChild variant="ghost" className="hidden sm:inline-flex text-white/60 hover:text-white">
              <Link to="/login">{t("nav.signIn")}</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white border-none px-6">
              <Link to="/signup">{t("nav.getStarted")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
