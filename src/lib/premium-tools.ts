/**
 * Configuration for the Premium-only "Ferramentas Premium" module.
 *
 * Each entry points to a page on the official blog that is embedded live inside
 * the app (never duplicated), so any change published on the blog is reflected
 * automatically. Add new premium pages by appending to this list — the route
 * and embedding logic are fully data-driven, making the module scalable.
 */

export interface PremiumPage {
  slug: string;
  title: string;
  description: string;
  url: string;
}

export const PREMIUM_PAGES: PremiumPage[] = [
  {
    slug: "ferramentas-gratuitas",
    title: "28 Ferramentas Gratuitas",
    description:
      "Coleção completa de ferramentas gratuitas para acelerar seu blog, SEO e produção de conteúdo.",
    url: "https://blog.monzart.com.br/p/28-ferramentas-gratuitas-para.html",
  },
];

export function findPremiumPage(slug: string): PremiumPage | undefined {
  return PREMIUM_PAGES.find((p) => p.slug === slug);
}
