---
name: Vitalgestor spreadsheet import
description: How the real-customer spreadsheet maps into the system
---
Spreadsheet groups by column CPF (= titular's CPF), NOT by row order (dependents can appear before their titular). Titular = TIPO USUARIO TITULAR; each titular becomes a cliente plus a PF responsável financeiro; dependents go in `dependentes`. Unknown vendedores are auto-created with placeholder email and random password.
**Why:** user's real data; dev DB changes never reach production, so import is an admin UI action (Clientes > Importar Vitalgestor) the user must run in the published app.
**How to apply:** EMPRESA code and payment detail (PIX BTG/CORA/C6) are kept in `observacao`, contratoId left null. "Substituir" wipes all test clientes/propostas/boletos/comissões/responsáveis in one transaction.
