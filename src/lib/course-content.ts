export interface CourseLesson {
  /** Stable key persisted in course_progress. */
  key: string;
  text: string;
}

export interface CourseModule {
  id: string;
  number: number;
  title: string;
  summary: string;
  /** Topics taught in this module (informational). */
  topics: string[];
  /** Checkable lessons that count towards progress. */
  lessons: CourseLesson[];
  /** When true, this module embeds the required-pages generator tool. */
  hasPageGenerator?: boolean;
  /** When true, this module is the final checklist. */
  isChecklist?: boolean;
}

export const COURSE_MODULES: CourseModule[] = [
  {
    id: "mod-1",
    number: 1,
    title: "Criando um blog profissional no Blogger",
    summary:
      "Os primeiros passos para estruturar um blog com aparência profissional desde o início.",
    topics: ["Escolha de nicho", "Escolha de domínio", "Estrutura inicial"],
    lessons: [
      { key: "mod1-l1", text: "Defini o objetivo principal do meu blog" },
      { key: "mod1-l2", text: "Escolhi um tema/layout limpo e responsivo" },
      { key: "mod1-l3", text: "Organizei a estrutura inicial (menu e categorias)" },
    ],
  },
  {
    id: "mod-2",
    number: 2,
    title: "Escolha de nicho e domínio",
    summary:
      "Como pesquisar e validar um nicho com demanda real e escolher um domínio profissional.",
    topics: ["Pesquisa de nicho", "Validação de demanda", "Escolha de domínio profissional"],
    lessons: [
      { key: "mod2-l1", text: "Pesquisei nichos com interesse do público" },
      { key: "mod2-l2", text: "Validei a demanda com ferramentas de pesquisa" },
      { key: "mod2-l3", text: "Escolhi um domínio profissional e fácil de lembrar" },
    ],
  },
  {
    id: "mod-3",
    number: 3,
    title: "Gerador automático de páginas obrigatórias",
    summary:
      "Gere automaticamente as páginas essenciais que todo blog profissional deve ter.",
    topics: ["Política de Privacidade", "Termos de Uso", "Sobre", "Contato"],
    hasPageGenerator: true,
    lessons: [
      { key: "mod3-l1", text: "Gerei a Política de Privacidade" },
      { key: "mod3-l2", text: "Gerei os Termos de Uso" },
      { key: "mod3-l3", text: "Gerei a página Sobre" },
      { key: "mod3-l4", text: "Gerei a página de Contato" },
    ],
  },
  {
    id: "mod-4",
    number: 4,
    title: "Estrutura recomendada para artigos",
    summary:
      "Boas práticas de formatação que melhoram a leitura e a experiência do usuário.",
    topics: ["Títulos", "Subtítulos", "SEO", "Escaneabilidade", "Imagens", "Experiência do usuário"],
    lessons: [
      { key: "mod4-l1", text: "Uso títulos e subtítulos hierárquicos (H2/H3)" },
      { key: "mod4-l2", text: "Escrevo parágrafos curtos e escaneáveis" },
      { key: "mod4-l3", text: "Incluo imagens relevantes com texto alternativo" },
    ],
  },
  {
    id: "mod-5",
    number: 5,
    title: "SEO para Blogger",
    summary: "Configurações técnicas de SEO que ajudam o Google a entender o seu blog.",
    topics: ["Sitemap", "Robots.txt", "URLs amigáveis", "Search Console", "Indexação"],
    lessons: [
      { key: "mod5-l1", text: "Configurei URLs amigáveis" },
      { key: "mod5-l2", text: "Enviei o sitemap ao Google Search Console" },
      { key: "mod5-l3", text: "Verifiquei a indexação das páginas" },
    ],
  },
  {
    id: "mod-6",
    number: 6,
    title: "Criação de conteúdo útil e original",
    summary: "Como produzir conteúdo autoral que atende à intenção de busca do leitor.",
    topics: ["Conteúdo autoral", "Intenção de busca", "Qualidade editorial", "Atualização de conteúdo"],
    lessons: [
      { key: "mod6-l1", text: "Produzo conteúdo autoral e original" },
      { key: "mod6-l2", text: "Atendo à intenção de busca do leitor" },
      { key: "mod6-l3", text: "Reviso e atualizo conteúdos antigos" },
    ],
  },
  {
    id: "mod-7",
    number: 7,
    title: "Preparação para monetização",
    summary:
      "Checklist de boas práticas para deixar seu blog mais profissional. Estas são apenas recomendações — não há garantia de aprovação ou monetização.",
    topics: ["Checklist completo", "Boas práticas", "Sem promessas"],
    lessons: [
      { key: "mod7-l1", text: "Meu blog tem as páginas obrigatórias publicadas" },
      { key: "mod7-l2", text: "Tenho um volume consistente de conteúdo original" },
      { key: "mod7-l3", text: "A navegação do blog é clara e funcional" },
    ],
  },
  {
    id: "mod-8",
    number: 8,
    title: "Erros comuns",
    summary: "Os erros que mais prejudicam blogs iniciantes — e como evitá-los.",
    topics: [
      "Conteúdo copiado",
      "Poucos artigos",
      "Falta de páginas obrigatórias",
      "SEO inexistente",
      "Navegação ruim",
      "Baixa qualidade editorial",
    ],
    lessons: [
      { key: "mod8-l1", text: "Não publico conteúdo copiado" },
      { key: "mod8-l2", text: "Evito blog com poucos artigos e SEO inexistente" },
      { key: "mod8-l3", text: "Mantenho boa navegação e qualidade editorial" },
    ],
  },
  {
    id: "mod-9",
    number: 9,
    title: "Checklist final",
    summary: "Revise tudo antes de considerar seu blog pronto. Marque cada tarefa concluída.",
    topics: ["Marcação de tarefas", "Progresso"],
    isChecklist: true,
    lessons: [
      { key: "final-1", text: "Nicho definido e validado" },
      { key: "final-2", text: "Domínio profissional configurado" },
      { key: "final-3", text: "Páginas obrigatórias publicadas (Privacidade, Termos, Sobre, Contato)" },
      { key: "final-4", text: "Estrutura de artigos otimizada para leitura e SEO" },
      { key: "final-5", text: "Sitemap enviado e páginas indexadas" },
      { key: "final-6", text: "Conteúdo original e útil em volume consistente" },
      { key: "final-7", text: "Navegação clara e experiência mobile funcional" },
      { key: "final-8", text: "Revisão final de qualidade editorial concluída" },
    ],
  },
];

export const ALL_LESSON_KEYS = COURSE_MODULES.flatMap((m) => m.lessons.map((l) => l.key));

export const PAGE_TYPES = [
  { id: "privacy", label: "Política de Privacidade" },
  { id: "terms", label: "Termos de Uso" },
  { id: "about", label: "Sobre" },
  { id: "contact", label: "Contato" },
] as const;

export type PageTypeId = (typeof PAGE_TYPES)[number]["id"];
