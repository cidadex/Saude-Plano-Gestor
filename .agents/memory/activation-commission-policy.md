---
name: Monthly per-beneficiary commission policy
description: Commission model (replaced the one-time activation commission); history must be preserved
---
Commission is monthly and per beneficiary (titular + each dependent). The gerente/admin types the values at proposal activation (and can edit later on an ATIVA proposal). A commission row (tipo MENSALIDADE, one per boleto, unique by boleto_id) is generated only when a boleto is marked PAGO, summing titular + dependents.

**Why:** user replaced the old vendedor-level fixed/percent one-time config; values vary by age, plan, capture type.
**How to apply:** titular value lives on clientes.comissao_mensal; dependents' values live inside propostas.dados_dependentes JSON (dependents have no rows at activation). Old VENDA commissions and vendedor comissao_modalidade/valor columns are kept as history but unused; no retroactive payouts. Gerente needs permission `ativar_propostas`. There is no Asaas webhook yet; boletos are marked paid manually in admin Cobrança.
