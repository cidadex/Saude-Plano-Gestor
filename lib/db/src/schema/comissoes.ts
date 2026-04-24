import { pgTable, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendedoresTable } from "./vendedores";

export const tipoComissaoRegEnum = pgEnum("tipo_comissao_reg", ["VENDA", "SERVICO"]);
export const statusComissaoEnum = pgEnum("status_comissao", ["PENDENTE", "PAGO"]);

export const comissoesTable = pgTable("comissoes", {
  id: text("id").primaryKey(),
  vendedorId: text("vendedor_id").notNull().references(() => vendedoresTable.id),
  clienteNome: text("cliente_nome").notNull(),
  tipo: tipoComissaoRegEnum("tipo").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  mesReferencia: text("mes_referencia").notNull(),
  status: statusComissaoEnum("status").notNull().default("PENDENTE"),
  planoCode: text("plano_code"),
  dataVenda: text("data_venda"),
  dataPagamento: text("data_pagamento"),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertComissaoSchema = createInsertSchema(comissoesTable).omit({ createdAt: true });
export type InsertComissao = z.infer<typeof insertComissaoSchema>;
export type Comissao = typeof comissoesTable.$inferSelect;
