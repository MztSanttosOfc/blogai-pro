/**
 * Contextual help content for the SEO Performance panel and the Central de
 * Ajuda page. Written in plain language so any user — with zero knowledge of
 * Google Cloud, OAuth or Search Console — can resolve each situation.
 *
 * Each topic maps 1:1 to a `SeoReason` (plus synthetic "ok" / "no-data"), so
 * the panel can deep-link straight to the relevant instructions.
 */

export type SeoHelpTopicId =
  | "ok"
  | "no-data"
  | "not-connected"
  | "scope-missing"
  | "api-disabled"
  | "unverified"
  | "no-permission"
  | "no-site"
  | "error";

export type SeoHelpSeverity = "green" | "yellow" | "red";

export interface SeoHelpStep {
  text: string;
  /** Optional external link the user can open to act on this step. */
  href?: string;
  hrefLabel?: string;
}

export interface SeoHelpTopic {
  id: SeoHelpTopicId;
  severity: SeoHelpSeverity;
  /** Short chip label. */
  title: string;
  /** One-line summary of what is happening. */
  summary: string;
  /** Whether resolving this depends on an action only the user can take. */
  needsUserAction: boolean;
  /** What the system already tried/does automatically. */
  automatic: string[];
  /** Ordered, plain-language steps the user can follow (empty when none). */
  steps: SeoHelpStep[];
}

const GSC_URL = "https://search.google.com/search-console";

export const SEO_HELP_TOPICS: Record<SeoHelpTopicId, SeoHelpTopic> = {
  ok: {
    id: "ok",
    severity: "green",
    title: "Integração funcionando",
    summary:
      "Sua conta Google está conectada, a propriedade foi verificada e os dados do Search Console estão sendo lidos normalmente.",
    needsUserAction: false,
    automatic: [
      "Renovação automática do acesso (access token) quando expira.",
      "Descoberta automática dos blogs e das propriedades do Search Console.",
      "Correspondência automática entre cada blog e sua propriedade.",
      "Atualização do cache e re-sincronização quando algo muda.",
    ],
    steps: [],
  },
  "no-data": {
    id: "no-data",
    severity: "yellow",
    title: "Ainda sem dados no período",
    summary:
      "Está tudo conectado e verificado, mas o Google ainda não tem cliques/impressões para o período selecionado. É normal em sites novos ou pode ser o atraso natural do Google (até ~48h).",
    needsUserAction: false,
    automatic: [
      "A leitura na API oficial funcionou com sucesso.",
      "O painel volta a mostrar os números assim que o Google processar os dados.",
    ],
    steps: [
      { text: "Escolha um período maior (ex.: últimos 3 meses) no seletor de datas." },
      { text: "Aguarde até 48h se o blog ou o conteúdo é recente e volte a atualizar." },
    ],
  },
  "not-connected": {
    id: "not-connected",
    severity: "red",
    title: "Conta Google não conectada",
    summary:
      "Para ver o desempenho, o BlogAI Pro precisa da sua conta Google (a mesma do Blogger e do Search Console).",
    needsUserAction: true,
    automatic: ["Assim que você conectar, tudo o mais é automático."],
    steps: [
      {
        text: "Abra a página Blogger/Conexões e clique em conectar sua conta Google.",
      },
      { text: "Autorize o acesso de leitura ao Search Console quando o Google pedir." },
    ],
  },
  "scope-missing": {
    id: "scope-missing",
    severity: "red",
    title: "Falta liberar o acesso de leitura",
    summary:
      "Sua conexão foi criada antes de existir o acesso ao Search Console. Basta reconectar uma única vez para liberar a leitura — isso não afeta suas publicações.",
    needsUserAction: true,
    automatic: [
      "Depois de reconectar, o sistema renova a sessão sozinho e não pede login de novo.",
    ],
    steps: [
      { text: "Vá em Blogger/Conexões e clique em Reconectar conta Google." },
      {
        text: "Na tela do Google, mantenha marcada a permissão de leitura do Search Console e confirme.",
      },
      { text: "Volte aqui e clique em Atualizar." },
    ],
  },
  "api-disabled": {
    id: "api-disabled",
    severity: "red",
    title: "API do Search Console desativada",
    summary:
      "A API oficial do Google Search Console está desativada no projeto do Google Cloud usado por esta integração.",
    needsUserAction: true,
    automatic: ["Assim que a API for ativada, a leitura passa a funcionar automaticamente."],
    steps: [
      {
        text: "Abra o Google Cloud Console com a mesma conta Google conectada.",
        href: "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com",
        hrefLabel: "Abrir Google Cloud Console",
      },
      { text: 'Selecione o projeto correto e clique em Ativar na "Google Search Console API".' },
      { text: "Aguarde 1–2 minutos e volte aqui para atualizar." },
    ],
  },
  unverified: {
    id: "unverified",
    severity: "red",
    title: "Propriedade ainda não verificada",
    summary:
      "Encontramos a propriedade do seu blog no Search Console, mas o próprio Google informa que a conta conectada ainda NÃO é proprietária verificada dela (permissão siteUnverifiedUser). Por isso o Google bloqueia a leitura — o BlogAI Pro apenas reflete o que a API oficial responde.",
    needsUserAction: true,
    automatic: [
      "O sistema já detectou a propriedade e a associou ao blog automaticamente.",
      "Assim que a verificação for concluída, a leitura é liberada sem reconectar nada.",
    ],
    steps: [
      {
        text: "Abra o Google Search Console com a MESMA conta Google conectada aqui.",
        href: GSC_URL,
        hrefLabel: "Abrir Search Console",
      },
      {
        text: "Selecione a propriedade do seu blog e conclua a verificação de propriedade (para propriedade de Domínio é um registro DNS; para prefixo de URL há outras opções, como a meta tag).",
      },
      {
        text: "Se a propriedade pertence a outra pessoa, peça para ela adicionar seu e-mail em Configurações → Usuários e permissões como proprietário.",
      },
      { text: "Depois volte aqui e clique em Atualizar — nenhuma reconexão é necessária." },
    ],
  },
  "no-permission": {
    id: "no-permission",
    severity: "red",
    title: "Sem permissão nesta propriedade",
    summary:
      "A conta conectada aparece na propriedade, mas sem um nível de permissão que o Google autorize a ler os dados.",
    needsUserAction: true,
    automatic: ["Assim que a permissão for concedida, a leitura passa a funcionar sozinha."],
    steps: [
      {
        text: "Peça ao proprietário da propriedade para adicionar seu e-mail em Configurações → Usuários e permissões.",
        href: GSC_URL,
        hrefLabel: "Abrir Search Console",
      },
      { text: "Depois volte aqui e clique em Atualizar." },
    ],
  },
  "no-site": {
    id: "no-site",
    severity: "red",
    title: "Sem propriedade correspondente",
    summary:
      "Este blog ainda não tem uma propriedade correspondente no Google Search Console na conta conectada.",
    needsUserAction: true,
    automatic: ["Assim que a propriedade existir, o sistema a associa ao blog automaticamente."],
    steps: [
      {
        text: "Abra o Search Console e adicione o endereço do seu blog como uma nova propriedade (Domínio ou prefixo de URL), usando a mesma conta Google conectada.",
        href: GSC_URL,
        hrefLabel: "Abrir Search Console",
      },
      { text: "Conclua a verificação da propriedade recém-criada." },
      { text: "Volte aqui e clique em Atualizar." },
    ],
  },
  error: {
    id: "error",
    severity: "red",
    title: "Falha temporária",
    summary: "Não foi possível falar com o Search Console agora. Normalmente é temporário.",
    needsUserAction: false,
    automatic: ["O sistema tenta novamente e renova a sessão sozinho quando possível."],
    steps: [
      { text: "Clique em Atualizar em alguns instantes." },
      { text: "Se persistir, reconecte sua conta Google em Blogger/Conexões." },
    ],
  },
};

/** Ordered list for rendering the full Help Center. */
export const SEO_HELP_ORDER: SeoHelpTopicId[] = [
  "ok",
  "no-data",
  "not-connected",
  "scope-missing",
  "unverified",
  "no-permission",
  "no-site",
  "api-disabled",
  "error",
];

/** Resolve the current help topic from the panel state. */
export function resolveHelpTopic(
  available: boolean | undefined,
  reason: string | undefined,
  hasData: boolean,
): SeoHelpTopicId {
  if (available) return hasData ? "ok" : "no-data";
  if (reason && reason in SEO_HELP_TOPICS) return reason as SeoHelpTopicId;
  return "error";
}
