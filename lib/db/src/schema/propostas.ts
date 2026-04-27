import { pgTable, text, timestamp, date, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendedoresTable } from "./vendedores";
import { usersTable } from "./users";
import { contratosTable } from "./contratos";
import { responsaveisFinanceirosTable } from "./responsaveis";

export const statusPropostaEnum = pgEnum("status_proposta", [
  "AGUARDANDO_ENVIO",
  "ENVIADA_OPERADORA",
  "ACEITA",
  "RECUSADA",
  "ATIVA",
]);

export const propostasTable = pgTable("propostas", {
  id: text("id").primaryKey(),
  vendedorId: text("vendedor_id").notNull().references(() => vendedoresTable.id),
  adminId: text("admin_id").references(() => usersTable.id),
  status: statusPropostaEnum("status").notNull().default("AGUARDANDO_ENVIO"),
  dadosTitular: jsonb("dados_titular").$type<Record<string, unknown>>().notNull(),
  dadosDependentes: jsonb("dados_dependentes").$type<Record<string, unknown>[]>().notNull().default([]),
  planoId: text("plano_id"),
  faixaId: text("faixa_id"),
  contratoId: text("contrato_id").references(() => contratosTable.id),
  responsavelFinanceiroId: text("responsavel_financeiro_id").references(() => responsaveisFinanceirosTable.id),
  valorTotal: text("valor_total"),
  motivoRecusa: text("motivo_recusa"),
  dataEnvioOperadora: timestamp("data_envio_operadora"),
  dataRetorno: timestamp("data_retorno"),
  dataAtivacao: timestamp("data_ativacao"),
  clienteId: text("cliente_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPropostaSchema = createInsertSchema(propostasTable).omit({ createdAt: true, updatedAt: true });
export type InsertProposta = z.infer<typeof insertPropostaSchema>;
export type Proposta = typeof propostasTable.$inferSelect;
