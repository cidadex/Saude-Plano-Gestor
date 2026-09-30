import { pgTable, text, numeric, timestamp, date, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientesTable } from "./clientes";
import { usersTable } from "./users";

export const statusBoletoEnum = pgEnum("status_boleto", [
  "PENDENTE",
  "PAGO",
  "VENCIDO",
  "CANCELADO",
]);

export const boletosTable = pgTable("boletos", {
  id: text("id").primaryKey(),
  clienteId: text("cliente_id").notNull().references(() => clientesTable.id),
  geradoPorId: text("gerado_por_id").references(() => usersTable.id),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  vencimento: date("vencimento").notNull(),
  status: statusBoletoEnum("status").notNull().default("PENDENTE"),
  codigoBarras: text("codigo_barras"),
  mesReferencia: text("mes_referencia").notNull(),
  linkPagamento: text("link_pagamento"),
  dataPagamento: date("data_pagamento"),
  asaasPaymentId: text("asaas_payment_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  asaasPaymentIdUnique: uniqueIndex("boletos_asaas_payment_id_unique").on(table.asaasPaymentId),
}));

export const insertBoletoSchema = createInsertSchema(boletosTable).omit({ createdAt: true });
export type InsertBoleto = z.infer<typeof insertBoletoSchema>;
export type Boleto = typeof boletosTable.$inferSelect;
