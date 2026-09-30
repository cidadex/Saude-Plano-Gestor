import { and, eq, inArray } from "drizzle-orm";
import { idsTabelasDoVendedor } from "./tabelasVendedor.js";
import {
  db,
  planosTable,
  tabelasPrecoFaixasTable,
  tabelasPrecoTable,
} from "@workspace/db";

type QueryExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SelecaoProposta =
  | {
      ok: true;
      tabelaId: string;
      planoId: string;
      planoNome: string;
      planoCodigo: string | null;
      faixaId: string;
      faixaEtaria: string;
      valorTitular: string;
    }
  | { ok: false; error: string };

/**
 * Validates the proposal's root plan/age-band selection against the seller's
 * assigned price table. The root faixa is the titular price source; dependent
 * values must never be used for activation.
 */
export async function validarSelecaoProposta(
  tx: QueryExecutor,
  vendedorId: string,
  planoId: unknown,
  faixaId: unknown,
): Promise<SelecaoProposta> {
  const plano = typeof planoId === "string" ? planoId.trim() : "";
  const faixa = typeof faixaId === "string" ? faixaId.trim() : "";
  if (!plano || !faixa) {
    return {
      ok: false,
      error: "Selecione o plano e a faixa etária do titular antes de continuar.",
    };
  }

  const tabelaIds = await idsTabelasDoVendedor(tx, vendedorId);
  if (!tabelaIds.length) {
    return {
      ok: false,
      error: "O vendedor não possui uma tabela de preço atribuída.",
    };
  }

  const [selection] = await tx
    .select({
      tabelaId: tabelasPrecoTable.id,
      planoId: planosTable.id,
      planoNome: planosTable.nome,
      planoCodigo: planosTable.codigo,
      faixaId: tabelasPrecoFaixasTable.id,
      faixaEtaria: tabelasPrecoFaixasTable.faixaEtaria,
      valorTitular: tabelasPrecoFaixasTable.valor,
    })
    .from(tabelasPrecoTable)
    .innerJoin(
      tabelasPrecoFaixasTable,
      and(
        eq(tabelasPrecoFaixasTable.tabelaId, tabelasPrecoTable.id),
        eq(tabelasPrecoFaixasTable.planoId, plano),
        eq(tabelasPrecoFaixasTable.id, faixa),
      ),
    )
    .innerJoin(
      planosTable,
      and(
        eq(planosTable.id, tabelasPrecoFaixasTable.planoId),
        eq(planosTable.ativo, true),
      ),
    )
    .where(inArray(tabelasPrecoTable.id, tabelaIds))
    .limit(1);

  if (!selection) {
    return {
      ok: false,
      error: "O plano e a faixa selecionados não pertencem às tabelas de preço do vendedor.",
    };
  }
  if (selection.faixaEtaria.toUpperCase().includes("DEPENDENTE")) {
    return {
      ok: false,
      error: "Selecione uma faixa de titular; a faixa de dependente não pode ativar o titular.",
    };
  }

  return { ok: true, ...selection };
}