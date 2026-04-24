import { pgTable, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendedoresTable } from "./vendedores";

export const tipoPlanoEnum = pgEnum("tipo_plano", [
  "AMBULATORIAL",
  "HOSPITALAR",
  "ODONTOLOGICO",
  "AMBULATORIAL_HOSPITALAR",
  "COMPLETO",
]);

export const planosTable = pgTable("planos", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: tipoPlanoEnum("tipo").notNull(),
  descricao: text("descricao"),
  operadora: text("operadora").notNull().default("Hapvida"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tabelasPrecoTable = pgTable("tabelas_preco", {
  id: text("id").primaryKey(),
  vendedorId: text("vendedor_id").notNull().references(() => vendedoresTable.id),
  nome: text("nome").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tabelasPrecoFaixasTable = pgTable("tabelas_preco_faixas", {
  id: text("id").primaryKey(),
  tabelaId: text("tabela_id").notNull().references(() => tabelasPrecoTable.id),
  planoId: text("plano_id").notNull().references(() => planosTable.id),
  faixaEtaria: text("faixa_etaria").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
});

export const insertPlanoSchema = createInsertSchema(planosTable).omit({ createdAt: true });
export const insertTabelaPrecoSchema = createInsertSchema(tabelasPrecoTable).omit({ createdAt: true });
export const insertTabelaPrecoFaixaSchema = createInsertSchema(tabelasPrecoFaixasTable);

export type InsertPlano = z.infer<typeof insertPlanoSchema>;
export type Plano = typeof planosTable.$inferSelect;
export type TabelaPreco = typeof tabelasPrecoTable.$inferSelect;
export type TabelaPrecoFaixa = typeof tabelasPrecoFaixasTable.$inferSelect;
