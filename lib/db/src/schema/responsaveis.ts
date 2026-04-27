import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const tipoResponsavelEnum = pgEnum("tipo_responsavel", ["PF", "PJ"]);

export const responsaveisFinanceirosTable = pgTable("responsaveis_financeiros", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => usersTable.id),
  tipo: tipoResponsavelEnum("tipo").notNull().default("PF"),
  nome: text("nome").notNull(),
  cpfCnpj: text("cpf_cnpj").notNull().unique(),
  email: text("email"),
  telefone: text("telefone"),
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertResponsavelSchema = createInsertSchema(responsaveisFinanceirosTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertResponsavelFinanceiro = z.infer<typeof insertResponsavelSchema>;
export type ResponsavelFinanceiro = typeof responsaveisFinanceirosTable.$inferSelect;
