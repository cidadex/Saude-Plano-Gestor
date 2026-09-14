import { pgTable, text, boolean, numeric, timestamp, pgEnum, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const tipoComissaoEnum = pgEnum("tipo_comissao", ["VENDA", "SERVICO", "AMBOS"]);
export const comissaoModalidadeEnum = pgEnum("comissao_modalidade", ["FIXO", "PERCENTUAL"]);

export const vendedoresTable = pgTable("vendedores", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  comissionado: boolean("comissionado").notNull().default(false),
  tipoComissao: tipoComissaoEnum("tipo_comissao"),
  comissaoModalidade: comissaoModalidadeEnum("comissao_modalidade"),
  comissaoValor: numeric("comissao_valor", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  comissaoConfigValida: check(
    "vendedores_comissao_config_valida",
    sql`(
      (${table.comissaoModalidade} is null and ${table.comissaoValor} is null)
      or (
        ${table.comissaoModalidade} is not null
        and ${table.comissaoValor} is not null
        and ${table.comissaoValor} > 0
        and (${table.comissaoModalidade} <> 'PERCENTUAL' or ${table.comissaoValor} <= 100)
      )
    )`,
  ),
}));

export const insertVendedorSchema = createInsertSchema(vendedoresTable).omit({ createdAt: true });
export type InsertVendedor = z.infer<typeof insertVendedorSchema>;
export type Vendedor = typeof vendedoresTable.$inferSelect;
