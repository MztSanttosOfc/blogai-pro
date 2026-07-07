export type RoadmapStatus =
  | "planejado"
  | "em-desenvolvimento"
  | "em-testes"
  | "concluido";

export interface RoadmapEntry {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  /** Previsão de lançamento (texto livre, ex.: "Q3 2026"). */
  eta?: string;
  /** Destaca atualizações importantes. */
  highlight?: boolean;
  /** Data de liberação (somente para histórico). */
  releasedAt?: string;
}

export const STATUS_META: Record<
  RoadmapStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  planejado: {
    label: "Planejado",
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  "em-desenvolvimento": {
    label: "Em desenvolvimento",
    badgeClass: "bg-primary/15 text-primary",
    dotClass: "bg-primary",
  },
  "em-testes": {
    label: "Em testes",
    badgeClass: "bg-warning/15 text-warning",
    dotClass: "bg-warning",
  },
  concluido: {
    label: "Concluído",
    badgeClass: "bg-success/15 text-success",
    dotClass: "bg-success",
  },
};

/** Próximas atualizações planejadas. Edite esta lista para gerenciar o roadmap. */
export const UPCOMING_UPDATES: RoadmapEntry[] = [
  {
    id: "android-play-store",
    title: "App Android na Google Play",
    description:
      "Publicação oficial do BlogAI Pro na Play Store via Capacitor, com login Google e Blogger funcionando dentro do app.",
    status: "em-desenvolvimento",
    eta: "Q3 2026",
    highlight: true,
  },
];

/** Histórico das últimas atualizações já liberadas. */
export const RELEASED_UPDATES: RoadmapEntry[] = [
  {
    id: "auditoria-seo-blog",
    title: "Auditoria SEO profissional do blog",
    description:
      "A ferramenta 'Verificar Meu Blog' passou a avaliar artigos, headings, meta tags, dados estruturados, sitemap e performance com pontuação ponderada.",
    status: "concluido",
    releasedAt: "2026-06-16",
    highlight: true,
  },
  {
    id: "central-atualizacoes",
    title: "Central de Atualizações Futuras",
    description:
      "Nova área para acompanhar o roadmap e o histórico de melhorias do BlogAI Pro.",
    status: "concluido",
    releasedAt: "2026-06-16",
  },
  {
    id: "imagens-automaticas",
    title: "Imagens automáticas por IA",
    description:
      "Geração de imagem de destaque e imagens internas otimizadas (lazy-load e dimensões fixas) para cada artigo.",
    status: "concluido",
    releasedAt: "2026-06-13",
  },
  {
    id: "modos-inteligentes",
    title: "Modos inteligentes de criação",
    description:
      "Geração de artigos nos modos Inteligente, Automático e Avançado com estratégia de SEO.",
    status: "concluido",
    releasedAt: "2026-06-14",
  },
  {
    id: "kit-adsense",
    title: "Kit de páginas para AdSense",
    description:
      "Geração das páginas essenciais (Sobre, Privacidade, Contato e mais) para aprovação em programas de monetização.",
    status: "concluido",
    releasedAt: "2026-06-13",
  },
];
