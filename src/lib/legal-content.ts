// BlogAI Pro — conteúdo jurídico estruturado (PT-BR / EN-US).
// Somente conteúdo: nenhuma regra de negócio depende deste arquivo.
import { APP_INFO, LEGAL_LAST_UPDATED } from "./app-info";

export type LegalDocId = "privacidade" | "termos" | "cookies" | "licencas" | "sobre";
export type LegalLang = "pt-BR" | "en-US";

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  id: LegalDocId;
  title: string;
  subtitle: string;
  updatedLabel: string;
  sections: LegalSection[];
}

export const LEGAL_DOC_ORDER: LegalDocId[] = [
  "privacidade",
  "termos",
  "cookies",
  "licencas",
  "sobre",
];

export const LEGAL_ROUTES: Record<LegalDocId, string> = {
  privacidade: "/legal/privacidade",
  termos: "/legal/termos",
  cookies: "/legal/cookies",
  licencas: "/legal/licencas",
  sobre: "/legal/sobre",
};

export interface OpenSourceEntry {
  name: string;
  license: string;
  url: string;
  usage: { "pt-BR": string; "en-US": string };
}

export const OPEN_SOURCE_LIBRARIES: OpenSourceEntry[] = [
  {
    name: "React",
    license: "MIT",
    url: "https://react.dev",
    usage: {
      "pt-BR": "Biblioteca de interface que renderiza todas as telas do aplicativo.",
      "en-US": "UI library that renders every screen of the app.",
    },
  },
  {
    name: "TanStack Start / Router / Query",
    license: "MIT",
    url: "https://tanstack.com",
    usage: {
      "pt-BR": "Framework full-stack, roteamento e cache de dados.",
      "en-US": "Full-stack framework, routing and data caching.",
    },
  },
  {
    name: "Supabase JS",
    license: "MIT",
    url: "https://supabase.com",
    usage: {
      "pt-BR": "Cliente de banco de dados, autenticação e armazenamento.",
      "en-US": "Database, authentication and storage client.",
    },
  },
  {
    name: "Tailwind CSS",
    license: "MIT",
    url: "https://tailwindcss.com",
    usage: {
      "pt-BR": "Sistema de estilos e design tokens do aplicativo.",
      "en-US": "Styling system and design tokens.",
    },
  },
  {
    name: "Radix UI",
    license: "MIT",
    url: "https://www.radix-ui.com",
    usage: {
      "pt-BR": "Componentes acessíveis (diálogos, abas, menus, tooltips).",
      "en-US": "Accessible primitives (dialogs, tabs, menus, tooltips).",
    },
  },
  {
    name: "Lucide Icons",
    license: "ISC",
    url: "https://lucide.dev",
    usage: {
      "pt-BR": "Conjunto de ícones utilizado em toda a interface.",
      "en-US": "Icon set used across the interface.",
    },
  },
  {
    name: "TipTap",
    license: "MIT",
    url: "https://tiptap.dev",
    usage: {
      "pt-BR": "Editor de texto rico usado na edição de artigos.",
      "en-US": "Rich text editor used for article editing.",
    },
  },
  {
    name: "Framer Motion",
    license: "MIT",
    url: "https://motion.dev",
    usage: {
      "pt-BR": "Animações e transições da interface.",
      "en-US": "Interface animations and transitions.",
    },
  },
  {
    name: "Capacitor",
    license: "MIT",
    url: "https://capacitorjs.com",
    usage: {
      "pt-BR": "Empacotamento do aplicativo Android publicado na Google Play.",
      "en-US": "Android packaging for the Google Play release.",
    },
  },
  {
    name: "Recharts",
    license: "MIT",
    url: "https://recharts.org",
    usage: {
      "pt-BR": "Gráficos do painel de Analytics e Desempenho SEO.",
      "en-US": "Charts in Analytics and SEO Performance dashboards.",
    },
  },
  {
    name: "i18next / react-i18next",
    license: "MIT",
    url: "https://www.i18next.com",
    usage: {
      "pt-BR": "Internacionalização (Português e Inglês).",
      "en-US": "Internationalization (Portuguese and English).",
    },
  },
  {
    name: "Zod",
    license: "MIT",
    url: "https://zod.dev",
    usage: {
      "pt-BR": "Validação de dados no cliente e nos endpoints da API.",
      "en-US": "Data validation on the client and API endpoints.",
    },
  },
  {
    name: "date-fns",
    license: "MIT",
    url: "https://date-fns.org",
    usage: {
      "pt-BR": "Formatação de datas e horários.",
      "en-US": "Date and time formatting.",
    },
  },
  {
    name: "Sonner",
    license: "MIT",
    url: "https://sonner.emilkowal.ski",
    usage: {
      "pt-BR": "Notificações (toasts) do sistema.",
      "en-US": "System toast notifications.",
    },
  },
  {
    name: "marked / turndown",
    license: "MIT",
    url: "https://marked.js.org",
    usage: {
      "pt-BR": "Conversão entre Markdown e HTML dos artigos.",
      "en-US": "Markdown/HTML conversion for articles.",
    },
  },
  {
    name: "Stripe SDK",
    license: "MIT",
    url: "https://stripe.com",
    usage: {
      "pt-BR": "Processamento de pagamentos internacionais (USD).",
      "en-US": "International payment processing (USD).",
    },
  },
  {
    name: "Vite",
    license: "MIT",
    url: "https://vite.dev",
    usage: {
      "pt-BR": "Build e empacotamento da aplicação.",
      "en-US": "Application build and bundling.",
    },
  },
  {
    name: "TypeScript",
    license: "Apache-2.0",
    url: "https://www.typescriptlang.org",
    usage: {
      "pt-BR": "Linguagem tipada usada em todo o código-fonte.",
      "en-US": "Typed language used across the codebase.",
    },
  },
];

const PT: Record<Exclude<LegalDocId, "licencas" | "sobre">, LegalDoc> = {
  privacidade: {
    id: "privacidade",
    title: "Política de Privacidade",
    subtitle: `Como o ${APP_INFO.name} coleta, usa, armazena e protege os seus dados.`,
    updatedLabel: LEGAL_LAST_UPDATED,
    sections: [
      {
        id: "intro",
        title: "1. Quem somos",
        paragraphs: [
          `O ${APP_INFO.name} é uma plataforma de criação, otimização e publicação de conteúdo com inteligência artificial, desenvolvida e operada por ${APP_INFO.developer} (${APP_INFO.developerFull}).`,
          `Esta política explica, de forma transparente, quais dados tratamos e por quê. Ela se aplica ao site ${APP_INFO.website}, ao aplicativo Android (${APP_INFO.androidPackage}) e à API oficial.`,
        ],
      },
      {
        id: "dados",
        title: "2. Dados que coletamos",
        paragraphs: ["Coletamos apenas o necessário para operar o serviço:"],
        bullets: [
          "Dados de conta: nome, nome de exibição, e-mail, data de nascimento (opcional), idioma, país e fuso horário.",
          "Foto de perfil (avatar), quando enviada voluntariamente por você.",
          "Conteúdo gerado: artigos, páginas, clusters, agendamentos, links personalizados e preferências do Perfil Inteligente.",
          "Dados de uso: registros de atividade dentro da conta, consumo de créditos e histórico de gerações.",
          "Dados de pagamento: plano, status da assinatura, histórico de transações e identificadores do gateway. Não armazenamos números de cartão.",
          "Dados técnicos: endereço IP, tipo de dispositivo, navegador, idioma e registros de erro necessários à segurança e ao suporte.",
        ],
      },
      {
        id: "finalidade",
        title: "3. Por que coletamos",
        bullets: [
          "Criar e manter sua conta e autenticar seus acessos.",
          "Gerar, salvar, otimizar e publicar seu conteúdo.",
          "Controlar créditos, planos, cobranças e recompensas de indicação.",
          "Exibir métricas de desempenho do seu blog.",
          "Prevenir fraude, abuso e uso indevido da plataforma.",
          "Prestar suporte e comunicar mudanças relevantes do serviço.",
        ],
      },
      {
        id: "armazenamento",
        title: "4. Como armazenamos",
        paragraphs: [
          "Os dados ficam em infraestrutura gerenciada (banco de dados PostgreSQL e armazenamento de arquivos) com criptografia em trânsito (HTTPS/TLS) e em repouso.",
          "O acesso aos registros é isolado por usuário através de políticas de segurança em nível de linha (RLS). Operações administrativas ocorrem apenas no servidor, nunca no navegador.",
        ],
      },
      {
        id: "integracoes",
        title: "5. Integrações de terceiros",
        paragraphs: [
          "Compartilhamos dados apenas com os provedores necessários para o funcionamento das funcionalidades que você ativar:",
        ],
        bullets: [
          "Google Login (OAuth): usamos seu nome, e-mail e foto pública apenas para autenticação. Nunca temos acesso à sua senha do Google.",
          "Blogger API: com sua autorização, acessamos a lista dos seus blogs e publicamos os artigos que você solicitar. Você pode revogar o acesso a qualquer momento.",
          "Google Search Console: leitura de métricas de desempenho (cliques, impressões, CTR e posição) das propriedades que você autorizar. Somente leitura.",
          "Stripe: processamento de pagamentos internacionais (USD). Os dados do cartão são tratados diretamente pela Stripe.",
          "SyncPay: processamento de pagamentos em BRL (Pix). Os dados financeiros são tratados diretamente pelo provedor.",
          "Provedores de Inteligência Artificial: recebem o tema e as instruções necessárias para gerar textos e imagens.",
          "Google AdSense: pode exibir anúncios em áreas gratuitas da plataforma, conforme as políticas do Google.",
        ],
      },
      {
        id: "ia",
        title: "6. Inteligência Artificial",
        paragraphs: [
          "Ao gerar um artigo, imagem ou página, enviamos ao provedor de IA apenas as instruções necessárias (tema, palavras-chave, estilo e preferências do Perfil Inteligente).",
          "Não usamos o seu conteúdo privado para treinar modelos próprios. O conteúdo gerado pertence a você, conforme os Termos de Uso.",
        ],
      },
      {
        id: "avatar",
        title: "7. Upload de avatar",
        paragraphs: [
          "A imagem enviada é armazenada em um bucket dedicado e associada exclusivamente à sua conta. Você pode substituí-la ou removê-la a qualquer momento em Meu Perfil.",
        ],
      },
      {
        id: "cookies",
        title: "8. Cookies e armazenamento local",
        paragraphs: [
          "Utilizamos cookies e armazenamento local para manter sua sessão ativa, lembrar seu idioma, moeda e preferências de interface. Detalhes completos estão na Política de Cookies.",
        ],
      },
      {
        id: "creditos",
        title: "9. Créditos e pagamentos",
        paragraphs: [
          "Registramos o saldo de créditos, o consumo por operação e o histórico de compras para fins de transparência, suporte e obrigações fiscais.",
          "Não temos acesso aos dados completos do seu cartão: eles são processados exclusivamente pelos gateways de pagamento.",
        ],
      },
      {
        id: "seguranca",
        title: "10. Segurança",
        bullets: [
          "Comunicação criptografada (HTTPS/TLS) em todas as requisições.",
          "Isolamento de dados por usuário com políticas RLS no banco de dados.",
          "Chaves secretas armazenadas apenas no servidor, nunca expostas ao aplicativo.",
          "Autenticação por tokens de curta duração, com renovação automática.",
          "Registros de auditoria para operações sensíveis.",
        ],
      },
      {
        id: "direitos",
        title: "11. Seus direitos (LGPD / GDPR)",
        bullets: [
          "Confirmar a existência de tratamento e acessar seus dados.",
          "Corrigir dados incompletos ou desatualizados diretamente em Meu Perfil.",
          "Solicitar a portabilidade ou uma cópia dos seus dados.",
          "Revogar consentimentos e desconectar integrações quando quiser.",
          "Solicitar a exclusão da conta e dos dados associados.",
        ],
      },
      {
        id: "exclusao",
        title: "12. Exclusão de dados",
        paragraphs: [
          "Você pode excluir sua conta a qualquer momento em Meu Perfil → Segurança → Excluir minha conta.",
          "A exclusão remove seu perfil, artigos, páginas, agendamentos, conexões, avatar, códigos de convite e histórico de atividades. Registros financeiros exigidos por lei são anonimizados e mantidos apenas pelo prazo legal.",
          `Também é possível solicitar a exclusão por e-mail em ${APP_INFO.supportEmail}, com resposta em até 30 dias.`,
        ],
      },
      {
        id: "retencao",
        title: "13. Retenção",
        paragraphs: [
          "Mantemos os dados enquanto sua conta estiver ativa. Após a exclusão, os dados são apagados imediatamente, exceto os registros financeiros anonimizados exigidos pela legislação.",
        ],
      },
      {
        id: "menores",
        title: "14. Menores de idade",
        paragraphs: [
          "O serviço não se destina a menores de 13 anos. Se identificarmos uma conta nessa condição, ela será removida.",
        ],
      },
      {
        id: "contato",
        title: "15. Contato",
        paragraphs: [
          `Dúvidas sobre privacidade: ${APP_INFO.supportEmail}. Responsável pelo tratamento: ${APP_INFO.developerFull} (${APP_INFO.developer}).`,
        ],
      },
    ],
  },
  termos: {
    id: "termos",
    title: "Termos de Uso",
    subtitle: `Regras para utilização do ${APP_INFO.name} na web e no aplicativo Android.`,
    updatedLabel: LEGAL_LAST_UPDATED,
    sections: [
      {
        id: "aceite",
        title: "1. Aceitação",
        paragraphs: [
          `Ao criar uma conta ou utilizar o ${APP_INFO.name}, você concorda integralmente com estes Termos de Uso e com a Política de Privacidade. Caso não concorde, não utilize o serviço.`,
        ],
      },
      {
        id: "servico",
        title: "2. O que o serviço oferece",
        paragraphs: [
          "O BlogAI Pro permite gerar, editar, otimizar, agendar e publicar conteúdo com auxílio de inteligência artificial, além de acompanhar métricas de desempenho e gerenciar integrações com plataformas de blog.",
        ],
      },
      {
        id: "conta",
        title: "3. Conta e responsabilidades do usuário",
        bullets: [
          "Fornecer informações verdadeiras e mantê-las atualizadas.",
          "Manter a confidencialidade das credenciais de acesso.",
          "Ser o único responsável pelo conteúdo publicado a partir da sua conta.",
          "Revisar o conteúdo gerado por IA antes de publicá-lo.",
          "Não utilizar a plataforma para conteúdo ilegal, ofensivo, discriminatório, enganoso, spam ou que viole direitos de terceiros.",
          "Não tentar burlar limites de plano, créditos, rate limit ou mecanismos de segurança.",
        ],
      },
      {
        id: "planos",
        title: "4. Planos",
        paragraphs: [
          "Oferecemos plano gratuito e planos pagos. Cada plano define limites de créditos, recursos disponíveis e acesso a funcionalidades avançadas.",
          "Podemos ajustar recursos e preços mediante aviso prévio dentro da plataforma. Alterações não afetam ciclos já pagos.",
        ],
      },
      {
        id: "creditos",
        title: "5. Créditos",
        bullets: [
          "Créditos são consumidos por operação (geração de artigo, imagem, página ou otimização).",
          "Créditos não são conversíveis em dinheiro e não são transferíveis entre contas.",
          "Créditos obtidos por promoções, recompensas ou indicações podem ter prazo de validade informado no momento da concessão.",
          "O consumo é registrado e pode ser consultado em Financeiro e Minha Atividade.",
        ],
      },
      {
        id: "pagamentos",
        title: "6. Pagamentos",
        paragraphs: [
          "Pagamentos em BRL são processados via SyncPay (Pix) e pagamentos em USD via Stripe. A cobrança ocorre conforme o plano escolhido.",
          "A confirmação do pagamento libera automaticamente o plano e os créditos correspondentes. Falhas de pagamento podem suspender o acesso aos recursos pagos.",
        ],
      },
      {
        id: "cancelamento",
        title: "7. Cancelamento e reembolso",
        bullets: [
          "Você pode cancelar a assinatura a qualquer momento; o acesso permanece até o fim do período já pago.",
          "Não há reembolso proporcional de períodos parcialmente utilizados, salvo exigência legal.",
          "Consumidores no Brasil podem exercer o direito de arrependimento em até 7 dias da contratação, conforme o Código de Defesa do Consumidor, desde que não haja consumo relevante de créditos.",
        ],
      },
      {
        id: "ia",
        title: "8. Uso da inteligência artificial",
        paragraphs: [
          "O conteúdo gerado por IA é probabilístico e pode conter imprecisões. A revisão final é sempre responsabilidade do usuário.",
          "Não garantimos exclusividade, originalidade absoluta, posicionamento em buscadores, aprovação em programas de monetização ou resultados financeiros.",
        ],
      },
      {
        id: "propriedade",
        title: "9. Propriedade intelectual",
        paragraphs: [
          "Você mantém a titularidade do conteúdo que gera e publica através da plataforma.",
          `A marca, o design, o código-fonte e a arquitetura do ${APP_INFO.name} permanecem de propriedade de ${APP_INFO.developer}. É proibido copiar, revender ou realizar engenharia reversa do serviço.`,
        ],
      },
      {
        id: "integracoes",
        title: "10. Integrações de terceiros",
        paragraphs: [
          "Ao conectar Blogger, Google Search Console ou gateways de pagamento, você também aceita os termos desses provedores. Interrupções ou mudanças nesses serviços podem afetar funcionalidades correspondentes.",
        ],
      },
      {
        id: "disponibilidade",
        title: "11. Disponibilidade do serviço",
        paragraphs: [
          "Trabalhamos para manter alta disponibilidade, mas o serviço é fornecido “no estado em que se encontra”. Podem ocorrer manutenções programadas, indisponibilidades temporárias ou limitações causadas por terceiros.",
        ],
      },
      {
        id: "limitacao",
        title: "12. Limitação de responsabilidade",
        paragraphs: [
          "Na máxima extensão permitida pela lei, não respondemos por lucros cessantes, perda de dados decorrente de uso indevido, sanções aplicadas por plataformas de terceiros ou danos indiretos.",
        ],
      },
      {
        id: "encerramento",
        title: "13. Suspensão e encerramento",
        paragraphs: [
          "Podemos suspender ou encerrar contas que violem estes Termos, pratiquem fraude ou comprometam a segurança da plataforma. Você pode encerrar sua conta a qualquer momento em Meu Perfil.",
        ],
      },
      {
        id: "alteracoes",
        title: "14. Alterações destes Termos",
        paragraphs: [
          "Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas na plataforma. O uso continuado após a atualização representa concordância.",
        ],
      },
      {
        id: "foro",
        title: "15. Lei aplicável",
        paragraphs: [
          "Estes Termos são regidos pelas leis brasileiras, com foro na comarca do domicílio do consumidor.",
        ],
      },
    ],
  },
  cookies: {
    id: "cookies",
    title: "Política de Cookies",
    subtitle: "O que armazenamos no seu navegador e por quê.",
    updatedLabel: LEGAL_LAST_UPDATED,
    sections: [
      {
        id: "oque",
        title: "1. O que são cookies",
        paragraphs: [
          "Cookies e tecnologias equivalentes (localStorage e sessionStorage) são pequenos arquivos gravados no seu dispositivo para que o aplicativo funcione corretamente e lembre suas preferências.",
        ],
      },
      {
        id: "essenciais",
        title: "2. Cookies essenciais",
        paragraphs: [
          "Necessários para o funcionamento básico. Não podem ser desativados sem inviabilizar o serviço.",
        ],
        bullets: [
          "Manutenção da sessão e proteção contra requisições maliciosas.",
          "Balanceamento de carga e segurança da infraestrutura.",
        ],
      },
      {
        id: "auth",
        title: "3. Cookies de autenticação",
        paragraphs: [
          "Armazenam o token de acesso e o token de renovação da sua sessão, permitindo que você permaneça conectado com segurança entre visitas. São removidos ao sair da conta.",
        ],
      },
      {
        id: "preferencias",
        title: "4. Preferências",
        bullets: [
          "Idioma escolhido (PT-BR ou EN-US).",
          "Moeda preferida para exibição de preços.",
          "Estado da barra lateral e preferências de interface.",
        ],
      },
      {
        id: "local",
        title: "5. Armazenamento local",
        paragraphs: [
          "Usamos o armazenamento local do navegador para guardar rascunhos temporários, preferências de geração e cache de dados não sensíveis, reduzindo carregamentos desnecessários.",
        ],
      },
      {
        id: "analytics",
        title: "6. Cookies analíticos e de anúncios",
        paragraphs: [
          "Podemos utilizar cookies analíticos para entender o uso agregado da plataforma e cookies do Google AdSense para exibir anúncios em áreas gratuitas. Esses dados são tratados de forma agregada.",
        ],
      },
      {
        id: "gerenciar",
        title: "7. Como gerenciar",
        paragraphs: [
          "Você pode bloquear ou apagar cookies nas configurações do seu navegador ou do sistema Android. A remoção de cookies essenciais e de autenticação encerra sua sessão e pode impedir o uso do aplicativo.",
        ],
      },
    ],
  },
};

const EN: Record<Exclude<LegalDocId, "licencas" | "sobre">, LegalDoc> = {
  privacidade: {
    id: "privacidade",
    title: "Privacy Policy",
    subtitle: `How ${APP_INFO.name} collects, uses, stores and protects your data.`,
    updatedLabel: LEGAL_LAST_UPDATED,
    sections: [
      {
        id: "intro",
        title: "1. Who we are",
        paragraphs: [
          `${APP_INFO.name} is an AI-powered content creation, optimization and publishing platform built and operated by ${APP_INFO.developer} (${APP_INFO.developerFull}).`,
          `This policy applies to ${APP_INFO.website}, the Android app (${APP_INFO.androidPackage}) and the official API.`,
        ],
      },
      {
        id: "dados",
        title: "2. Data we collect",
        paragraphs: ["We only collect what is needed to run the service:"],
        bullets: [
          "Account data: name, display name, email, birth date (optional), language, country and time zone.",
          "Profile picture (avatar), when you upload one.",
          "Generated content: articles, pages, clusters, schedules, custom links and Smart Profile preferences.",
          "Usage data: in-app activity logs, credit consumption and generation history.",
          "Payment data: plan, subscription status, transaction history and gateway identifiers. We never store card numbers.",
          "Technical data: IP address, device type, browser, language and error logs required for security and support.",
        ],
      },
      {
        id: "finalidade",
        title: "3. Why we collect it",
        bullets: [
          "Create and maintain your account and authenticate access.",
          "Generate, store, optimize and publish your content.",
          "Manage credits, plans, billing and referral rewards.",
          "Display performance metrics for your blog.",
          "Prevent fraud, abuse and misuse of the platform.",
          "Provide support and announce relevant service changes.",
        ],
      },
      {
        id: "armazenamento",
        title: "4. How we store it",
        paragraphs: [
          "Data is hosted on managed infrastructure (PostgreSQL database and object storage) encrypted in transit (HTTPS/TLS) and at rest.",
          "Records are isolated per user through row level security (RLS). Administrative operations run only on the server, never in the browser.",
        ],
      },
      {
        id: "integracoes",
        title: "5. Third-party integrations",
        paragraphs: ["We share data only with providers required by features you enable:"],
        bullets: [
          "Google Sign-In (OAuth): we use your name, email and public picture for authentication only. We never see your Google password.",
          "Blogger API: with your authorization we list your blogs and publish the articles you request. You can revoke access anytime.",
          "Google Search Console: read-only access to performance metrics (clicks, impressions, CTR and position) for properties you authorize.",
          "Stripe: international payment processing (USD). Card data is handled directly by Stripe.",
          "SyncPay: BRL payment processing (Pix). Financial data is handled directly by the provider.",
          "AI providers: receive only the topic and instructions required to generate text and images.",
          "Google AdSense: may display ads in free areas of the platform, per Google policies.",
        ],
      },
      {
        id: "ia",
        title: "6. Artificial Intelligence",
        paragraphs: [
          "When generating an article, image or page, we send the AI provider only the required instructions (topic, keywords, style and Smart Profile preferences).",
          "We do not use your private content to train our own models. Generated content belongs to you, as stated in the Terms of Use.",
        ],
      },
      {
        id: "avatar",
        title: "7. Avatar uploads",
        paragraphs: [
          "Uploaded images are stored in a dedicated bucket bound to your account. You can replace or remove them anytime in My Profile.",
        ],
      },
      {
        id: "cookies",
        title: "8. Cookies and local storage",
        paragraphs: [
          "We use cookies and local storage to keep your session active and remember language, currency and interface preferences. Full details are in the Cookie Policy.",
        ],
      },
      {
        id: "creditos",
        title: "9. Credits and payments",
        paragraphs: [
          "We record credit balance, per-operation consumption and purchase history for transparency, support and tax obligations.",
          "We have no access to full card data: it is processed exclusively by the payment gateways.",
        ],
      },
      {
        id: "seguranca",
        title: "10. Security",
        bullets: [
          "Encrypted communication (HTTPS/TLS) on every request.",
          "Per-user data isolation with database RLS policies.",
          "Secret keys stored server-side only, never exposed to the app.",
          "Short-lived authentication tokens with automatic refresh.",
          "Audit logging for sensitive operations.",
        ],
      },
      {
        id: "direitos",
        title: "11. Your rights (GDPR / LGPD)",
        bullets: [
          "Confirm processing and access your data.",
          "Correct incomplete or outdated data directly in My Profile.",
          "Request portability or a copy of your data.",
          "Withdraw consent and disconnect integrations anytime.",
          "Request deletion of your account and associated data.",
        ],
      },
      {
        id: "exclusao",
        title: "12. Data deletion",
        paragraphs: [
          "You can delete your account anytime in My Profile → Security → Delete my account.",
          "Deletion removes your profile, articles, pages, schedules, connections, avatar, invite codes and activity history. Financial records required by law are anonymized and kept only for the legal retention period.",
          `You may also request deletion by email at ${APP_INFO.supportEmail}; we respond within 30 days.`,
        ],
      },
      {
        id: "retencao",
        title: "13. Retention",
        paragraphs: [
          "We keep data while your account is active. After deletion, data is erased immediately, except anonymized financial records required by law.",
        ],
      },
      {
        id: "menores",
        title: "14. Children",
        paragraphs: [
          "The service is not intended for children under 13. Accounts identified as such will be removed.",
        ],
      },
      {
        id: "contato",
        title: "15. Contact",
        paragraphs: [
          `Privacy questions: ${APP_INFO.supportEmail}. Data controller: ${APP_INFO.developerFull} (${APP_INFO.developer}).`,
        ],
      },
    ],
  },
  termos: {
    id: "termos",
    title: "Terms of Use",
    subtitle: `Rules for using ${APP_INFO.name} on the web and on Android.`,
    updatedLabel: LEGAL_LAST_UPDATED,
    sections: [
      {
        id: "aceite",
        title: "1. Acceptance",
        paragraphs: [
          `By creating an account or using ${APP_INFO.name} you fully agree to these Terms of Use and to the Privacy Policy. If you disagree, do not use the service.`,
        ],
      },
      {
        id: "servico",
        title: "2. What the service offers",
        paragraphs: [
          "BlogAI Pro lets you generate, edit, optimize, schedule and publish content with AI assistance, track performance metrics and manage blog integrations.",
        ],
      },
      {
        id: "conta",
        title: "3. Account and user responsibilities",
        bullets: [
          "Provide accurate information and keep it up to date.",
          "Keep your credentials confidential.",
          "You are solely responsible for content published from your account.",
          "Review AI-generated content before publishing it.",
          "Do not use the platform for illegal, offensive, discriminatory, misleading or spam content, or content infringing third-party rights.",
          "Do not attempt to bypass plan limits, credits, rate limits or security mechanisms.",
        ],
      },
      {
        id: "planos",
        title: "4. Plans",
        paragraphs: [
          "We offer a free plan and paid plans. Each plan defines credit limits, available resources and access to advanced features.",
          "We may adjust features and pricing with prior notice inside the platform. Changes do not affect cycles already paid.",
        ],
      },
      {
        id: "creditos",
        title: "5. Credits",
        bullets: [
          "Credits are consumed per operation (article, image, page or optimization).",
          "Credits have no cash value and are not transferable between accounts.",
          "Promotional, reward or referral credits may have an expiration date stated when granted.",
          "Consumption is logged and visible under Billing and My Activity.",
        ],
      },
      {
        id: "pagamentos",
        title: "6. Payments",
        paragraphs: [
          "BRL payments are processed via SyncPay (Pix) and USD payments via Stripe, according to the selected plan.",
          "Confirmed payments automatically unlock the plan and matching credits. Payment failures may suspend access to paid features.",
        ],
      },
      {
        id: "cancelamento",
        title: "7. Cancellation and refunds",
        bullets: [
          "You may cancel anytime; access remains until the end of the paid period.",
          "No pro-rated refunds for partially used periods, unless required by law.",
          "Brazilian consumers may withdraw within 7 days of purchase under the Consumer Protection Code, provided credits were not materially consumed.",
        ],
      },
      {
        id: "ia",
        title: "8. Use of AI",
        paragraphs: [
          "AI output is probabilistic and may contain inaccuracies. Final review is always the user's responsibility.",
          "We do not guarantee exclusivity, absolute originality, search rankings, monetization approval or financial results.",
        ],
      },
      {
        id: "propriedade",
        title: "9. Intellectual property",
        paragraphs: [
          "You retain ownership of the content you generate and publish through the platform.",
          `The ${APP_INFO.name} brand, design, source code and architecture remain owned by ${APP_INFO.developer}. Copying, reselling or reverse engineering the service is prohibited.`,
        ],
      },
      {
        id: "integracoes",
        title: "10. Third-party integrations",
        paragraphs: [
          "By connecting Blogger, Google Search Console or payment gateways you also accept those providers' terms. Outages or changes on their side may affect related features.",
        ],
      },
      {
        id: "disponibilidade",
        title: "11. Service availability",
        paragraphs: [
          "We aim for high availability, but the service is provided “as is”. Scheduled maintenance, temporary outages or third-party limitations may occur.",
        ],
      },
      {
        id: "limitacao",
        title: "12. Limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by law we are not liable for lost profits, data loss caused by misuse, penalties applied by third-party platforms or indirect damages.",
        ],
      },
      {
        id: "encerramento",
        title: "13. Suspension and termination",
        paragraphs: [
          "We may suspend or terminate accounts that violate these Terms, commit fraud or compromise platform security. You may close your account anytime in My Profile.",
        ],
      },
      {
        id: "alteracoes",
        title: "14. Changes to these Terms",
        paragraphs: [
          "We may update these Terms. Relevant changes will be announced in the platform. Continued use means acceptance.",
        ],
      },
      {
        id: "foro",
        title: "15. Governing law",
        paragraphs: [
          "These Terms are governed by Brazilian law, with jurisdiction at the consumer's domicile.",
        ],
      },
    ],
  },
  cookies: {
    id: "cookies",
    title: "Cookie Policy",
    subtitle: "What we store in your browser and why.",
    updatedLabel: LEGAL_LAST_UPDATED,
    sections: [
      {
        id: "oque",
        title: "1. What cookies are",
        paragraphs: [
          "Cookies and equivalent technologies (localStorage and sessionStorage) are small files stored on your device so the app works properly and remembers your preferences.",
        ],
      },
      {
        id: "essenciais",
        title: "2. Essential cookies",
        paragraphs: [
          "Required for basic operation. They cannot be disabled without breaking the service.",
        ],
        bullets: [
          "Session maintenance and protection against malicious requests.",
          "Load balancing and infrastructure security.",
        ],
      },
      {
        id: "auth",
        title: "3. Authentication cookies",
        paragraphs: [
          "Store your access and refresh tokens so you stay securely signed in between visits. They are removed when you sign out.",
        ],
      },
      {
        id: "preferencias",
        title: "4. Preferences",
        bullets: [
          "Selected language (PT-BR or EN-US).",
          "Preferred currency for pricing display.",
          "Sidebar state and interface preferences.",
        ],
      },
      {
        id: "local",
        title: "5. Local storage",
        paragraphs: [
          "We use browser local storage for temporary drafts, generation preferences and caching of non-sensitive data to reduce unnecessary loads.",
        ],
      },
      {
        id: "analytics",
        title: "6. Analytics and advertising cookies",
        paragraphs: [
          "We may use analytics cookies to understand aggregate usage and Google AdSense cookies to display ads in free areas. This data is handled in aggregate form.",
        ],
      },
      {
        id: "gerenciar",
        title: "7. Managing cookies",
        paragraphs: [
          "You can block or delete cookies in your browser or Android settings. Removing essential and authentication cookies ends your session and may prevent using the app.",
        ],
      },
    ],
  },
};

export function getLegalDoc(lang: string, id: Exclude<LegalDocId, "licencas" | "sobre">): LegalDoc {
  return lang.startsWith("en") ? EN[id] : PT[id];
}

export function isEnglish(lang: string): boolean {
  return lang.startsWith("en");
}
