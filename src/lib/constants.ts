import type { LucideIcon } from "lucide-react";
import { Sparkles, Crown, Rocket } from "lucide-react";

export const TONES = [
  "Profissional",
  "Casual",
  "Persuasivo",
  "Informativo",
  "Amigável",
  "Entusiasmado",
  "Técnico",
  "Storytelling",
] as const;

export const LANGUAGES = [
  "Português",
  "Inglês",
  "Espanhol",
  "Francês",
  "Alemão",
  "Italiano",
] as const;

export const WORD_COUNTS = [500, 800, 1200, 1500, 2000] as const;

export type PlanId = "free" | "pro" | "premium" | "teste";

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  credits: string;
  icon: LucideIcon;
  highlight?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    credits: "10 créditos / mês",
    icon: Sparkles,
    features: [
      "10 artigos gerados por mês",
      "Gerador de SEO básico",
      "Biblioteca de artigos",
      "Exportar texto",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 49",
    period: "/mês",
    credits: "150 créditos / mês",
    icon: Rocket,
    highlight: true,
    features: [
      "150 artigos por mês",
      "SEO avançado + FAQ + Tags",
      "Múltiplos idiomas e tons",
      "Publicação no Blogger",
      "Suporte prioritário",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 129",
    period: "/mês",
    credits: "Créditos ilimitados",
    icon: Crown,
    features: [
      "Artigos ilimitados",
      "Tudo do plano Pro",
      "Agendamento automático",
      "Otimização de monetização",
      "Gerente de conta dedicado",
    ],
  },
];

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Gratuito",
  pro: "Pro",
  premium: "Premium",
  teste: "Teste",
};
