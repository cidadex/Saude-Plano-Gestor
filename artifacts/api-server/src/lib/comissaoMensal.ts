import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  boletosTable,
  clientesTable,
  comissoesTable,
  propostasTable,
  vendedoresTable,
} from "@workspace/db";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class ComissaoInvalidaError extends Error {}

function asMoney(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

/** Parses a monetary input (accepts "12,50"). Returns null when empty. */
export function parseValorComissao(value: unknown, rotulo: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    throw new ComissaoInvalidaError(`Comissão mensal inválida para ${rotulo}`);
  }
  return asMoney(n);
}

/**
 * Validates and applies the monthly commission of the titular (stored on the
 * client) and of each dependent (stored on the proposal's dependents JSON).
 * `requerido` forces every value to be filled (used at activation for
 * commissioned sellers).
 */
export async function aplicarComissaoMensal(
  tx: Transaction,
  propostaId: string,
  clienteId: string,
  input: { titular: unknown; dependentes: unknown },
  requerido: boolean,
) {
  const [proposta] = await tx
    .select()
    .from(propostasTable)
    .where(eq(propostasTable.id, propostaId))
    .for("update")
    .limit(1);
  if (!proposta) throw new ComissaoInvalidaError("Proposta não encontrada");

  const dependentes = (proposta.dadosDependentes ?? []) as Record<string, unknown>[];
  const inputDeps = Array.isArray(input.dependentes) ? input.dependentes : [];

  const titular = parseValorComissao(input.titular, "o titular");
  if (requerido && titular === null) {
    throw new ComissaoInvalidaError("Informe a comissão mensal do titular");
  }

  const novosDeps = dependentes.map((dep, i) => {
    const valor = parseValorComissao(inputDeps[i], `o dependente ${String(dep.nome ?? i + 1)}`);
    if (requerido && valor === null) {
      throw new ComissaoInvalidaError(
        `Informe a comissão mensal do dependente ${String(dep.nome ?? i + 1)}`,
      );
    }
    return valor === null ? dep : { ...dep, comissaoMensal: valor };
  });

  if (titular !== null) {
    await tx
      .update(clientesTable)
      .set({ comissaoMensal: titular, updatedAt: new Date() })
      .where(eq(clientesTable.id, clienteId));
  }
  await tx
    .update(propostasTable)
    .set({ dadosDependentes: novosDeps, updatedAt: new Date() })
    .where(eq(propostasTable.id, propostaId));
}

/**
 * Creates the monthly commission for a paid boleto (titular + dependents).
 * Idempotent: one commission per boleto.
 */
export async function gerarComissaoMensalDoBoleto(tx: Transaction, boletoId: string) {
  const [boleto] = await tx.select().from(boletosTable).where(eq(boletosTable.id, boletoId)).limit(1);
  if (!boleto || boleto.status !== "PAGO") return null;

  const [cliente] = await tx.select().from(clientesTable).where(eq(clientesTable.id, boleto.clienteId)).limit(1);
  if (!cliente) return null;

  const [vendedor] = await tx
    .select()
    .from(vendedoresTable)
    .where(eq(vendedoresTable.id, cliente.vendedorId))
    .limit(1);
  if (!vendedor?.comissionado) return null;

  const [proposta] = await tx
    .select()
    .from(propostasTable)
    .where(and(eq(propostasTable.clienteId, cliente.id), eq(propostasTable.status, "ATIVA")))
    .orderBy(desc(propostasTable.updatedAt))
    .limit(1);

  const deps = (proposta?.dadosDependentes ?? []) as Record<string, unknown>[];
  const total =
    Number(cliente.comissaoMensal ?? 0) +
    deps.reduce((s, d) => s + (Number(d.comissaoMensal ?? 0) || 0), 0);
  if (!(total > 0)) return null;

  const [comissao] = await tx
    .insert(comissoesTable)
    .values({
      id: `com-${randomUUID()}`,
      vendedorId: cliente.vendedorId,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      tipo: "MENSALIDADE",
      valor: asMoney(total),
      mesReferencia: boleto.mesReferencia,
      status: "PENDENTE",
      planoCode: cliente.planoCode,
      dataVenda: boleto.dataPagamento ?? new Date().toISOString().slice(0, 10),
      observacao: "Comissão mensal (mensalidade paga)",
      boletoId: boleto.id,
    })
    .onConflictDoNothing()
    .returning();
  return comissao ?? null;
}
