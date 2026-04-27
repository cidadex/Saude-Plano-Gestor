import { pgTable, text, numeric, integer, timestamp, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendedoresTable } from "./vendedores";
import { planosTable, tabelasPrecoFaixasTable } from "./planos";
import { usersTable } from "./users";
import { contratosTable } from "./contratos";
import { responsaveisFinanceirosTable } from "./responsaveis";

export const statusClienteEnum = pgEnum("status_cliente", [
  "ATIVO",
  "SUSPENSO",
  "CANCELADO",
]);

export const sexoEnum = pgEnum("sexo", ["M", "F"]);

export const grauParentescoEnum = pgEnum("grau_parentesco", [
  "CONJUGE",
  "FILHO",
  "FILHA",
  "PAI",
  "MAE",
  "IRMAO",
  "IRMA",
  "OUTRO",
]);

export const clientesTable = pgTable("clientes", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => usersTable.id),
  vendedorId: text("vendedor_id").notNull().references(() => vendedoresTable.id),
  planoId: text("plano_id").references(() => planosTable.id),
  faixaId: text("faixa_id").references(() => tabelasPrecoFaixasTable.id),
  nome: text("nome").notNull(),
  cpf: text("cpf").notNull().unique(),
  dataNascimento: date("data_nascimento"),
  sexo: sexoEnum("sexo"),
  telefone: text("telefone"),
  email: text("email"),
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  cns: text("cns"),
  nomeMae: text("nome_mae"),
  rg: text("rg"),
  rgOrgaoEmissor: text("rg_orgao_emissor"),
  rgUf: text("rg_uf"),
  estadoCivil: text("estado_civil"),
  docRgUrl: text("doc_rg_url"),
  docComprovanteUrl: text("doc_comprovante_url"),
  contratoId: text("contrato_id").references(() => contratosTable.id),
  responsavelFinanceiroId: text("responsavel_financeiro_id").references(() => responsaveisFinanceirosTable.id),
  matricula: text("matricula"),
  valorMensal: numeric("valor_mensal", { precision: 10, scale: 2 }),
  dataVigencia: date("data_vigencia"),
  status: statusClienteEnum("status").notNull().default("ATIVO"),
  motivoCancelamento: text("motivo_cancelamento"),
  observacao: text("observacao"),
  // Business fields
  codigo: text("codigo"),
  representante: text("representante"),
  tipo: text("tipo").notNull().default("TITULAR"),
  formaPagamento: text("forma_pagamento"),
  diaVencimento: integer("dia_vencimento"),
  vrPl: numeric("vr_pl", { precision: 10, scale: 2 }),
  saldo: numeric("saldo", { precision: 10, scale: 2 }),
  valor2026: numeric("valor_2026", { precision: 10, scale: 2 }),
  comissao: numeric("comissao", { precision: 10, scale: 2 }),
  dataAtivacao: date("data_ativacao"),
  planoCode: text("plano_code"),
  codigoPlano: text("codigo_plano"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dependentesTable = pgTable("dependentes", {
  id: text("id").primaryKey(),
  clienteId: text("cliente_id").notNull().references(() => clientesTable.id),
  planoId: text("plano_id").references(() => planosTable.id),
  faixaId: text("faixa_id").references(() => tabelasPrecoFaixasTable.id),
  nome: text("nome").notNull(),
  cpf: text("cpf"),
  dataNascimento: date("data_nascimento"),
  sexo: sexoEnum("sexo"),
  grauParentesco: grauParentescoEnum("grau_parentesco"),
  cns: text("cns"),
  valorMensal: numeric("valor_mensal", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClienteSchema = createInsertSchema(clientesTable).omit({ createdAt: true, updatedAt: true });
export const insertDependenteSchema = createInsertSchema(dependentesTable).omit({ createdAt: true });

export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientesTable.$inferSelect;
export type InsertDependente = z.infer<typeof insertDependenteSchema>;
export type Dependente = typeof dependentesTable.$inferSelect;
