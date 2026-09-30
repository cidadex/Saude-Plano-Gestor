import { pgTable, text, numeric, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendedoresTable } from "./vendedores";
import { clientesTable } from "./clientes";

export const tipoComissaoRegEnum = pgEnum("tipo_comissao_reg", ["VENDA", "SERVICO", "MENSALIDADE"]);
export const statusComissaoEnum = pgEnum("status_comissao", ["PENDENTE", "PAGO"]);

export const comissoesTable = pgTable("comissoes", {
  id: text("id").primaryKey(),
  vendedorId: text("vendedor_id").notNull().references(() => vendedoresTable.id),
  clienteId: text("cliente_id").references(() => clientesTable.id),
  clienteNome: text("cliente_nome").notNull(),
  tipo: tipoComissaoRegEnum("tipo").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  mesReferencia: text("mes_referencia").notNull(),
  status: statusComissaoEnum("status").notNull().default("PENDENTE"),
  planoCode: text("plano_code"),
  dataVenda: text("data_venda"),
  dataPagamento: text("data_pagamento"),
  observacao: text("observacao"),
  boletoId: text("boleto_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  clienteIdVendaUnique: uniqueIndex("comissoes_cliente_id_venda_unique")
    .on(table.clienteId)
    .where(sql`${table.tipo} = 'VENDA'`),
  boletoIdMensalUnique: uniqueIndex("comissoes_boleto_id_mensal_unique")
    .on(table.boletoId)
    .where(sql`${table.tipo} = 'MENSALIDADE'`),
}));

export const insertComissaoSchema = createInsertSchema(comissoesTable).omit({ createdAt: true });
export type InsertComissao = z.infer<typeof insertComissaoSchema>;
export type Comissao = typeof comissoesTable.$inferSelect;
