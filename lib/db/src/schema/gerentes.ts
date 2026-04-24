import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const gerentesTable = pgTable("gerentes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  permissoes: jsonb("permissoes").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const PERMISSOES_DISPONIVEIS = [
  "ver_dashboard",
  "ver_clientes",
  "ver_financeiro",
  "ver_comissoes",
  "ver_relatorios",
  "ver_equipe",
  "ver_propostas",
  "ver_cobranca",
] as const;

export type Permissao = (typeof PERMISSOES_DISPONIVEIS)[number];

export const insertGerenteSchema = createInsertSchema(gerentesTable).omit({ createdAt: true });
export type InsertGerente = z.infer<typeof insertGerenteSchema>;
export type Gerente = typeof gerentesTable.$inferSelect;
