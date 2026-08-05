import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { StatsSection } from "@/components/landing/StatsSection";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { Comparison } from "@/components/landing/Comparison";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";
import { Pricing } from "@/components/landing/Pricing";
import { FAQSection } from "@/components/landing/FAQSection";
import { Testimonials } from "@/components/landing/Testimonials";
import { ScreenshotsCarousel } from "@/components/landing/ScreenshotsCarousel";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

const SITE_URL = "https://monzart.com.br";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlogAI Pro — IA Premium para Blogueiros Profissionais" },
      {
        name: "description",
        content: "Transforme ideias em tráfego orgânico com a inteligência artificial mais avançada do mercado. SEO automático, publicação em 1 clique e dashboard real do Search Console.",
      },
      { property: "og:title", content: "BlogAI Pro — A Revolução da IA no Blogger" },
      {
        property: "og:description",
        content: "Escreva, otimize e publique em segundos. Economize 96% do seu tempo com IA de nível enterprise.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: `${SITE_URL}/og-image.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BlogAI Pro — A Revolução da IA no Blogger" },
      {
        name: "twitter:description",
        content: "Escreva, otimize e publique em segundos. Economize 96% do seu tempo com IA de nível enterprise.",
      },
      { name: "twitter:image", content: `${SITE_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "BlogAI Pro",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web, Android",
          "description": "IA Premium para blogueiros profissionais: gere, otimize e publique artigos com SEO automático.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "BRL"
          }
        }),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  useSmoothScroll();

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30 selection:text-emerald-400">
      <Navbar />
      
      <main>
        <Hero />
        <StatsSection />
        
        <div id="features">
          <FeatureGrid />
        </div>
        
        <ScreenshotsCarousel />
        <Comparison />
        
        <div id="how">
          <InteractiveDemo />
        </div>
        
        <Testimonials />
        <Pricing />
        <FAQSection />
        <FinalCta />
      </main>

      <Footer />

      {/* Global Background Overlays */}
      <div className="fixed inset-0 pointer-events-none -z-50">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.05)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.05)_0%,transparent_50%)]" />
      </div>
    </div>
  );
}
