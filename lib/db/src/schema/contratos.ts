import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const asaasModoEnum = pgEnum("asaas_modo", ["SANDBOX", "PRODUCAO"]);

export const contratosTable = pgTable("contratos", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  asaasApiKey: text("asaas_api_key"),
  asaasModo: asaasModoEnum("asaas_modo").notNull().default("SANDBOX"),
  asaasWebhookToken: text("asaas_webhook_token"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertContratoSchema = createInsertSchema(contratosTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertContrato = z.infer<typeof insertContratoSchema>;
export type Contrato = typeof contratosTable.$inferSelect;
