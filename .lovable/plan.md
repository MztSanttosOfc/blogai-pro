# BlogAI Pro — Plataforma SaaS completa

Implementação em fases dentro de uma mesma entrega. A integração de pagamento real (SyncPay) depende das suas credenciais; vou solicitá-las no momento certo (formulário seguro de secrets). Sem elas, todo o código fica pronto, mas o pagamento real só funciona após o cadastro das credenciais.

## 1. Banco de dados (migrações)
Novas tabelas em `public` (com GRANT + RLS por usuário autenticado):
- `plans` — catálogo de planos (free/pro/premium): nome, preço, créditos, recursos. Leitura pública.
- `subscriptions` — assinatura do usuário: plano, status, início, próxima renovação.
- `payments` — pagamentos: valor, método (pix), status, id externo SyncPay, plano comprado.
- `credit_transactions` — histórico de créditos: tipo (concessão/consumo/renovação), quantidade, saldo, descrição.
- `financial_logs` — logs de auditoria financeira e de webhooks.
- `course_progress` — aulas/módulos concluídos por usuário (checklist da Central de Monetização).
- `blog_checks` — resultados da ferramenta "Verificar Meu Blog".
Atualizar trigger `handle_new_user` para registrar a concessão inicial de 10 créditos em `credit_transactions`.

## 2. Landing — botões reais
- **Começar agora grátis**: se autenticado → `/dashboard`; senão → `/login` (com link Criar Conta + Login Google).
- **Ver como funciona**: modal/slider responsivo com 7 passos, barra de progresso, indicadores, Próximo/Voltar/Fechar e animações (framer-motion).
- Mensagem de boas-vindas pós-cadastro.

## 3. Central de Monetização Blogger (área Premium)
Novo item no menu lateral (protegido por plano premium). Curso com 9 módulos conforme especificado, interface com:
- Barra de progresso, percentual, aulas concluídas, navegação entre módulos, marcação de tarefas (persistida em `course_progress`).
- **Aviso claro** em destaque: conteúdo é apenas recomendações/boas práticas; nenhuma promessa de aprovação ou monetização pelo Google AdSense.
- **Módulo 3 — Gerador de páginas obrigatórias**: usuário informa nome do blog, URL e e-mail; IA (Lovable AI) gera Política de Privacidade, Termos de Uso, Sobre e Contato.

## 4. Ferramenta "Verificar Meu Blog" (Premium)
Usuário informa URL. Server function busca o HTML do blog e analisa presença de páginas obrigatórias, sitemap, navegação e volume de conteúdo. Gera relatório visual com pontuação e recomendações, salvo em `blog_checks`. Aviso de que é apenas orientativo.

## 5. Planos e gating
- Reestruturar planos (free/pro/premium) com recursos premium listados.
- Guardas de rota por plano: rotas premium redirecionam não-premium para `/pricing`.

## 6. SyncPay (pagamento real via Pix)
- Server-only client: autenticação Client ID/Secret → Bearer token com cache e renovação automática ao expirar.
- Cash-In: geração de cobrança Pix (QR/copia-e-cola) a partir do plano escolhido em `/pricing`.
- **Webhook** em `src/routes/api/public/webhooks/syncpay.ts`: valida requisição, identifica pagamento aprovado, ativa plano, renova créditos, registra `payments`/`subscriptions`/`credit_transactions`/`financial_logs`.
- Ao final, exibo a **URL exata do webhook** para cadastrar na SyncPay.
- Credenciais (`SYNCPAY_CLIENT_ID`, `SYNCPAY_CLIENT_SECRET`, `SYNCPAY_WEBHOOK_SECRET`) via secrets — nunca expostas ao cliente.

## 7. Dashboard financeiro
Seção no Dashboard: plano atual, créditos restantes, status da assinatura, próxima renovação, histórico de pagamentos, histórico de assinaturas e consumo de créditos.

## 8. Segurança
RLS por usuário em todas as tabelas; rotas premium protegidas; validação de webhook; tratamento de erros; logs de auditoria.

## 9. Preparação mobile (Capacitor)
Garantir responsividade total e navegação compatível com WebView. Estrutura pronta para conversão futura em app Android (não vou compilar o app agora, apenas deixar a base pronta).

## Detalhes técnicos
- Stack: TanStack Start + Lovable Cloud (Supabase). Lógica de servidor via `createServerFn`; webhook como server route em `/api/public/...`.
- IA: Lovable AI Gateway (sem chave extra).
- Migrações aplicadas via ferramenta de migração (aprovação separada).

## Observações / decisões necessárias
- **SyncPay**: preciso das credenciais para o pagamento real funcionar. Confirme o nome do plano/preços reais (PRO e PREMIUM) e os valores em R$ para gerar as cobranças corretas, ou mantenho R$ 49 (PRO) e R$ 129 (PREMIUM) já existentes.

Dada a extensão, vou implementar em ordem: DB → planos/gating → landing/onboarding → Central de Monetização → Verificar Meu Blog → SyncPay+webhook → dashboard financeiro → ajustes mobile.