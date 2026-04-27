# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Sistema de Gestão de Vendas de Plano de Saúde

### Arquitetura
- **API Server** (`artifacts/api-server`): Express 5 + JWT (cookie httpOnly "sid") + Drizzle ORM
- **Frontend** (`artifacts/gestao-planos`): React + Vite + Wouter + TanStack Query + shadcn/ui
- **DB** (`lib/db`): PostgreSQL com Drizzle ORM

### Papéis / Rotas
- `admin` → `/admin/*`
- `vendedor` → `/vendedor/*`
- `responsavel` (PJ ou PF financeiro) — login via `POST /api/auth/login` (mesmos campos), portal próprio em planejamento
- `cliente` (beneficiário) → `POST /api/auth/cliente/login` (CPF + nascimento)
- Seed via `POST /api/seed`

### Credenciais de teste
- `admin@teste.com` / `123456` (admin)
- `wladson@teste.com` / `123456` (vendedor v1 — 3 clientes)
- `carol@teste.com` / `123456` (vendedor v2 — 2 clientes)
- `financeiro@acme.com.br` / `123456` (responsável financeiro PJ — Acme)
- CPF `483.665.870-53` / nasc. `02/05/1967` (beneficiário)

### Features implementadas
- Auth JWT (cookie + middleware `requireAuth`)
- CRUD: propostas, clientes, boletos, comissoes
- Dados isolados por vendedor (sem cross-contamination)
- WhatsApp via wa.me com 3 templates (BOLETO, ATRASO, SUSPENSAO)
- Registro de comunicações no banco (`comunicacoes` table) ao abrir WhatsApp
- Página `/vendedor/historico` com histórico completo de mensagens enviadas + filtros
- **Contratos** (`contratos`): cada contrato guarda chave Asaas (sandbox/produção). CRUD admin em `/admin/contratos`. Seed cria `ctr-padrao` (PF individual) e `ctr-corp-acme` (PJ corporativo).
- **Responsáveis Financeiros** (`responsaveis_financeiros`): PF ou PJ pré-cadastrados pelo admin. Podem ter login próprio (vinculado a `users` com role `responsavel`). CRUD admin em `/admin/responsaveis`.
- Cadastro de cliente exige Contrato + Responsável Financeiro + dia vencimento (1–31, validado server-side) + valor mensal + forma pagamento. Patches em `/admin/clientes/:id` impedem nullification dos vínculos obrigatórios.
- Tabelas listagem (admin/clientes, admin/propostas, vendedor/propostas) exibem chips Contrato + Responsável (PF teal, PJ indigo).

### Rotas públicas (autenticadas) novas
- `GET /api/contratos` — lista contratos ativos (todos os papéis autenticados)
- `GET /api/responsaveis-financeiros` — lista responsáveis (admin/vendedor/gerente)
- Importante: em `routes/index.ts`, esses routers vêm ANTES do `adminRouter`, pois o admin guard responde 403 unconditionally para qualquer requisição não-admin.

### Mapeamento de tipos WhatsApp → DB
- `BOLETO` → `BOLETO_EMITIDO`
- `ATRASO` → `ATRASO`
- `SUSPENSAO` → `AVISO_SUSPENSAO`

### Rotas da API relevantes
- `POST /api/comunicacoes` — registra envio de mensagem WhatsApp
- `GET /api/vendedor/comunicacoes` — histórico de comunicações do vendedor
