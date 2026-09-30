---
name: Tabela de preço ↔ vendedor model
description: Many-to-many table/vendedor assignment and legacy column handling
---
Official source is `tabelas_preco_vendedores`; legacy `tabelas_preco.vendedor_id` is kept nullable and only read as fallback.
**Why:** publish migration is a schema-only diff and cannot copy data; dropping the column risks prod data.
**How to apply:** backfill runs at api-server startup (`migrarAssociacoesLegadas`); always resolve a vendedor's tables via `lib/tabelasVendedor.ts`, never by `vendedorId` on tabelas. Uniqueness of plano+faixa per table is enforced in the API only (no DB constraint).
