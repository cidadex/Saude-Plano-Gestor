import { pgTable, text, numeric, boolean, integer, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
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
  // Campos de identificação e preço
  codigo: text("codigo"),
  categoria: text("categoria"),
  acomodacao: text("acomodacao"),
  valorTitular: numeric("valor_titular", { precision: 10, scale: 2 }),
  valorDependente: numeric("valor_dependente", { precision: 10, scale: 2 }),
  coberturas: text("coberturas"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tabela de preço por faixa etária — vinculada a um vendedor
export const tabelasPrecoTable = pgTable("tabelas_preco", {
  id: text("id").primaryKey(),
  // LEGADO: vínculo 1:1 antigo. A fonte oficial agora é tabelas_preco_vendedores
  // (muitos-para-muitos); esta coluna só é lida para migrar associações antigas.
  vendedorId: text("vendedor_id").references(() => vendedoresTable.id),
  nome: text("nome").notNull(),
  tipoPlano: text("tipo_plano"),
  ano: integer("ano"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Atribuição de tabelas a vendedores (muitos-para-muitos)
export const tabelasPrecoVendedoresTable = pgTable("tabelas_preco_vendedores", {
  id: text("id").primaryKey(),
  tabelaId: text("tabela_id").notNull().references(() => tabelasPrecoTable.id),
  vendedorId: text("vendedor_id").notNull().references(() => vendedoresTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  tabelaVendedorUnique: uniqueIndex("tabelas_preco_vendedores_tabela_vendedor_unique").on(t.tabelaId, t.vendedorId),
}));

// Faixas de preço por faixa etária
export const tabelasPrecoFaixasTable = pgTable("tabelas_preco_faixas", {
  id: text("id").primaryKey(),
  tabelaId: text("tabela_id").notNull().references(() => tabelasPrecoTable.id),
  planoId: text("plano_id").notNull().references(() => planosTable.id),
  faixaEtaria: text("faixa_etaria").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  valorApartamento: numeric("valor_apartamento", { precision: 10, scale: 2 }),
});

export const insertPlanoSchema = createInsertSchema(planosTable).omit({ createdAt: true });
export const insertTabelaPrecoSchema = createInsertSchema(tabelasPrecoTable).omit({ createdAt: true });
export const insertTabelaPrecoFaixaSchema = createInsertSchema(tabelasPrecoFaixasTable);

export type InsertPlano = z.infer<typeof insertPlanoSchema>;
export type Plano = typeof planosTable.$inferSelect;
export type TabelaPreco = typeof tabelasPrecoTable.$inferSelect;
export type TabelaPrecoFaixa = typeof tabelasPrecoFaixasTable.$inferSelect;
