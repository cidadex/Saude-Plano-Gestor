import { randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  clientesTable,
  comissoesTable,
  vendedoresTable,
  type Cliente,
} from "@workspace/db";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ActivationDate = string | Date | null | undefined;

export const COMISSAO_CONFIGURACAO_AUSENTE = "VENDEDOR_SEM_CONFIGURACAO";
export const COMISSAO_CONFIGURACAO_MENSAGEM =
  "Configure a modalidade e o valor da comissão do vendedor antes de ativar o cliente.";
export const COMISSAO_VALOR_MENSAL_AUSENTE = "CLIENTE_SEM_VALOR_MENSAL";
export const COMISSAO_VALOR_MENSAL_MENSAGEM =
  "O valor mensal do plano do titular não foi encontrado na seleção de preço.";

function asPositiveNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function asMoney(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function asDateParts(value: ActivationDate): { dataVenda: string; mesReferencia: string } {
  const source = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value ?? "").slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(source) ? source : new Date().toISOString().slice(0, 10);
  return {
    dataVenda: date,
    mesReferencia: `${date.slice(5, 7)}/${date.slice(0, 4)}`,
  };
}

/**
 * Creates the one-time activation commission and stores its amount on the
 * client. The caller must run this inside the same transaction that activates
 * or creates the client. The durable marker is set for every first activation,
 * including valid no-payout sellers.
 */
export async function ensureActivationCommission(
  tx: Transaction,
  cliente: Cliente,
  activationDate?: ActivationDate,
) {
  if (cliente.comissaoProcessada) return null;

  const [existing] = await tx
    .select()
    .from(comissoesTable)
    .where(and(eq(comissoesTable.clienteId, cliente.id), eq(comissoesTable.tipo, "VENDA")))
    .limit(1);
  if (existing) {
    await tx
      .update(clientesTable)
      .set({
        comissaoProcessada: true,
        ...(cliente.comissao === null ? { comissao: existing.valor } : {}),
        updatedAt: new Date(),
      })
      .where(eq(clientesTable.id, cliente.id));
    return existing;
  }

  // A pre-existing client snapshot is authoritative even if it predates the
  // durable marker. Do not overwrite it or create a retroactive commission.
  if (cliente.comissao !== null) {
    await tx
      .update(clientesTable)
      .set({ comissaoProcessada: true, updatedAt: new Date() })
      .where(eq(clientesTable.id, cliente.id));
    return null;
  }

  // Lock the seller while reading the configuration. This makes an activation
  // observe one coherent configuration even when an admin edits the seller
  // concurrently.
  const [vendedor] = await tx
    .select()
    .from(vendedoresTable)
    .where(eq(vendedoresTable.id, cliente.vendedorId))
    .for("update")
    .limit(1);

  // A non-commissioned seller is a valid no-payout activation, but it must
  // still be marked as processed so future reactivations cannot backfill one.
  if (!vendedor?.comissionado) {
    await tx
      .update(clientesTable)
      .set({ comissaoProcessada: true, updatedAt: new Date() })
      .where(eq(clientesTable.id, cliente.id));
    return null;
  }

  if (!vendedor.comissaoModalidade || !vendedor.comissaoValor) {
    throw new Error(COMISSAO_CONFIGURACAO_AUSENTE);
  }

  const configuredValue = asPositiveNumber(vendedor.comissaoValor);
  if (!configuredValue) throw new Error(COMISSAO_CONFIGURACAO_AUSENTE);

  let amount: number;
  if (vendedor.comissaoModalidade === "FIXO") {
    amount = configuredValue;
  } else {
    const monthlyValue = asPositiveNumber(cliente.valorMensal);
    if (!monthlyValue) throw new Error(COMISSAO_VALOR_MENSAL_AUSENTE);
    amount = monthlyValue * configuredValue / 100;
  }

  const snapshot = asMoney(amount);
  if (Number(snapshot) <= 0) {
    await tx
      .update(clientesTable)
      .set({ comissaoProcessada: true, updatedAt: new Date() })
      .where(eq(clientesTable.id, cliente.id));
    return null;
  }

  // A client row is locked by the caller for existing clients. The nullable
  // predicate also protects a legacy/manual snapshot from being overwritten.
  const [updatedCliente] = await tx
    .update(clientesTable)
    .set({ comissao: snapshot, comissaoProcessada: true, updatedAt: new Date() })
    .where(and(
      eq(clientesTable.id, cliente.id),
      eq(clientesTable.comissaoProcessada, false),
      isNull(clientesTable.comissao),
    ))
    .returning();
  if (!updatedCliente) return null;

  const { dataVenda, mesReferencia } = asDateParts(activationDate ?? cliente.dataAtivacao);
  const [comissao] = await tx
    .insert(comissoesTable)
    .values({
      id: `com-${randomUUID()}`,
      vendedorId: cliente.vendedorId,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      tipo: "VENDA",
      valor: snapshot,
      mesReferencia,
      status: "PENDENTE",
      planoCode: cliente.planoCode,
      dataVenda,
      observacao: "Comissão de ativação",
    })
    .returning();

  return comissao;
}