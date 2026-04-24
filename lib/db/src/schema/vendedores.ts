import { pgTable, text, boolean, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const tipoComissaoEnum = pgEnum("tipo_comissao", ["VENDA", "SERVICO", "AMBOS"]);

export const vendedoresTable = pgTable("vendedores", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  comissionado: boolean("comissionado").notNull().default(false),
  tipoComissao: tipoComissaoEnum("tipo_comissao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVendedorSchema = createInsertSchema(vendedoresTable).omit({ createdAt: true });
export type InsertVendedor = z.infer<typeof insertVendedorSchema>;
export type Vendedor = typeof vendedoresTable.$inferSelect;
