import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientesTable } from "./clientes";
import { usersTable } from "./users";

export const tipoComunicacaoEnum = pgEnum("tipo_comunicacao", [
  "BOLETO_EMITIDO",
  "ATRASO",
  "AVISO_SUSPENSAO",
  "SUSPENSO",
]);

export const comunicacoesTable = pgTable("comunicacoes", {
  id: text("id").primaryKey(),
  clienteId: text("cliente_id").notNull().references(() => clientesTable.id),
  operadorId: text("operador_id").references(() => usersTable.id),
  tipo: tipoComunicacaoEnum("tipo").notNull(),
  boletoId: text("boleto_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertComunicacaoSchema = createInsertSchema(comunicacoesTable).omit({ createdAt: true });
export type InsertComunicacao = z.infer<typeof insertComunicacaoSchema>;
export type Comunicacao = typeof comunicacoesTable.$inferSelect;
