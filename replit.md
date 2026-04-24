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
- Seed via `POST /api/seed`

### Credenciais de teste
- `wladson@seacec.com.br` / `123456` (vendedor v1 — 3 clientes)
- `carol@seacec.com.br` / `123456` (vendedor v2 — 2 clientes)

### Features implementadas
- Auth JWT (cookie + middleware `requireAuth`)
- CRUD: propostas, clientes, boletos, comissoes
- Dados isolados por vendedor (sem cross-contamination)
- WhatsApp via wa.me com 3 templates (BOLETO, ATRASO, SUSPENSAO)
- Registro de comunicações no banco (`comunicacoes` table) ao abrir WhatsApp
- Página `/vendedor/historico` com histórico completo de mensagens enviadas + filtros

### Mapeamento de tipos WhatsApp → DB
- `BOLETO` → `BOLETO_EMITIDO`
- `ATRASO` → `ATRASO`
- `SUSPENSAO` → `AVISO_SUSPENSAO`

### Rotas da API relevantes
- `POST /api/comunicacoes` — registra envio de mensagem WhatsApp
- `GET /api/vendedor/comunicacoes` — histórico de comunicações do vendedor
