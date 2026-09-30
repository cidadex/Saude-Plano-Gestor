import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  db, planosTable, tabelasPrecoTable, tabelasPrecoFaixasTable, tabelasPrecoVendedoresTable,
} from "@workspace/db";

type QueryExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Copia o vínculo legado (tabelas_preco.vendedor_id) para a tabela de atribuição. Idempotente. */
export async function migrarAssociacoesLegadas(): Promise<number> {
  const legadas = await db
    .select({ tabelaId: tabelasPrecoTable.id, vendedorId: tabelasPrecoTable.vendedorId })
    .from(tabelasPrecoTable)
    .where(isNotNull(tabelasPrecoTable.vendedorId));
  if (!legadas.length) return 0;
  const r = await db.insert(tabelasPrecoVendedoresTable)
    .values(legadas.map(l => ({ id: randomUUID(), tabelaId: l.tabelaId, vendedorId: l.vendedorId! })))
    .onConflictDoNothing()
    .returning({ id: tabelasPrecoVendedoresTable.id });
  return r.length;
}

/** Tabelas atribuídas ao vendedor (nova associação + fallback temporário ao vínculo legado). */
export async function idsTabelasDoVendedor(ex: QueryExecutor, vendedorId: string): Promise<string[]> {
  const novas = await ex.select({ id: tabelasPrecoVendedoresTable.tabelaId })
    .from(tabelasPrecoVendedoresTable).where(eq(tabelasPrecoVendedoresTable.vendedorId, vendedorId));
  const legadas = await ex.select({ id: tabelasPrecoTable.id })
    .from(tabelasPrecoTable).where(eq(tabelasPrecoTable.vendedorId, vendedorId));
  return [...new Set([...novas, ...legadas].map(r => r.id))];
}

/** Vendedores atribuídos a cada tabela (nova associação + legado). */
export async function vendedoresPorTabela(ex: QueryExecutor): Promise<Map<string, string[]>> {
  const novas = await ex.select({ t: tabelasPrecoVendedoresTable.tabelaId, v: tabelasPrecoVendedoresTable.vendedorId })
    .from(tabelasPrecoVendedoresTable);
  const legadas = await ex.select({ t: tabelasPrecoTable.id, v: tabelasPrecoTable.vendedorId })
    .from(tabelasPrecoTable).where(isNotNull(tabelasPrecoTable.vendedorId));
  const mapa = new Map<string, Set<string>>();
  for (const r of [...novas, ...legadas]) {
    if (!r.v) continue;
    if (!mapa.has(r.t)) mapa.set(r.t, new Set());
    mapa.get(r.t)!.add(r.v);
  }
  return new Map([...mapa].map(([k, v]) => [k, [...v]]));
}

/** Substitui (atomicamente) o conjunto de vendedores de uma tabela. */
export async function definirVendedoresDaTabela(tx: QueryExecutor, tabelaId: string, vendedorIds: string[]) {
  const ids = [...new Set(vendedorIds)];
  await tx.delete(tabelasPrecoVendedoresTable).where(eq(tabelasPrecoVendedoresTable.tabelaId, tabelaId));
  if (ids.length) {
    await tx.insert(tabelasPrecoVendedoresTable)
      .values(ids.map(v => ({ id: randomUUID(), tabelaId, vendedorId: v })));
  }
  // Mantém o campo legado coerente: limpa (a fonte oficial é a tabela de atribuição).
  await tx.update(tabelasPrecoTable).set({ vendedorId: null }).where(eq(tabelasPrecoTable.id, tabelaId));
}

/** Substitui (atomicamente) o conjunto de tabelas de um vendedor. */
export async function definirTabelasDoVendedor(tx: QueryExecutor, vendedorId: string, tabelaIds: string[]) {
  const ids = [...new Set(tabelaIds)];
  await tx.delete(tabelasPrecoVendedoresTable).where(eq(tabelasPrecoVendedoresTable.vendedorId, vendedorId));
  await tx.update(tabelasPrecoTable).set({ vendedorId: null }).where(eq(tabelasPrecoTable.vendedorId, vendedorId));
  if (ids.length) {
    await tx.insert(tabelasPrecoVendedoresTable)
      .values(ids.map(t => ({ id: randomUUID(), tabelaId: t, vendedorId })));
  }
}

export async function tabelasExistem(ex: QueryExecutor, ids: string[]): Promise<boolean> {
  if (!ids.length) return true;
  const r = await ex.select({ id: tabelasPrecoTable.id }).from(tabelasPrecoTable).where(inArray(tabelasPrecoTable.id, ids));
  return r.length === new Set(ids).size;
}

export interface PlanoDisponivel {
  id: string; nome: string; codigo: string | null; tipo: string; descricao: string | null;
  operadora: string; categoria: string | null; acomodacao: string | null;
  faixas: {
    id: string; label: string; faixaEtaria: string; valor: string; valorApartamento: string | null;
    tabelaId: string; tabelaNome: string;
  }[];
}

/** Tabelas, planos, faixas e preços disponíveis para o vendedor (todas as tabelas atribuídas). */
export async function carregarPlanosDoVendedor(vendedorId: string, opts: { somenteAtivos: boolean }) {
  const ids = await idsTabelasDoVendedor(db, vendedorId);
  if (!ids.length) return { tabelas: [], planos: [] as PlanoDisponivel[] };

  const tabelas = await db.select({
    id: tabelasPrecoTable.id, nome: tabelasPrecoTable.nome, tipoPlano: tabelasPrecoTable.tipoPlano, ano: tabelasPrecoTable.ano,
  }).from(tabelasPrecoTable).where(inArray(tabelasPrecoTable.id, ids)).orderBy(asc(tabelasPrecoTable.nome));

  const rows = await db.select({
    planoId: planosTable.id, planoNome: planosTable.nome, codigo: planosTable.codigo, tipo: planosTable.tipo,
    descricao: planosTable.descricao, operadora: planosTable.operadora, categoria: planosTable.categoria,
    acomodacao: planosTable.acomodacao,
    tabelaId: tabelasPrecoFaixasTable.tabelaId,
    faixaId: tabelasPrecoFaixasTable.id, faixaEtaria: tabelasPrecoFaixasTable.faixaEtaria,
    valor: tabelasPrecoFaixasTable.valor, valorApartamento: tabelasPrecoFaixasTable.valorApartamento,
  })
    .from(tabelasPrecoFaixasTable)
    .innerJoin(planosTable, opts.somenteAtivos
      ? and(eq(planosTable.id, tabelasPrecoFaixasTable.planoId), eq(planosTable.ativo, true))
      : eq(planosTable.id, tabelasPrecoFaixasTable.planoId))
    .where(inArray(tabelasPrecoFaixasTable.tabelaId, ids))
    .orderBy(planosTable.nome, tabelasPrecoFaixasTable.faixaEtaria);

  const nomeTabela = new Map(tabelas.map(t => [t.id, t.nome]));
  const tabelasPorPlano = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!tabelasPorPlano.has(r.planoId)) tabelasPorPlano.set(r.planoId, new Set());
    tabelasPorPlano.get(r.planoId)!.add(r.tabelaId);
  }

  const porPlano = new Map<string, PlanoDisponivel>();
  for (const r of rows) {
    let p = porPlano.get(r.planoId);
    if (!p) {
      p = {
        id: r.planoId, nome: r.planoNome, codigo: r.codigo, tipo: r.tipo, descricao: r.descricao,
        operadora: r.operadora, categoria: r.categoria, acomodacao: r.acomodacao, faixas: [],
      };
      porPlano.set(r.planoId, p);
    }
    const tn = nomeTabela.get(r.tabelaId) ?? "";
    const multi = (tabelasPorPlano.get(r.planoId)?.size ?? 0) > 1;
    p.faixas.push({
      id: r.faixaId, label: multi ? `${r.faixaEtaria} · ${tn}` : r.faixaEtaria, faixaEtaria: r.faixaEtaria,
      valor: r.valor, valorApartamento: r.valorApartamento, tabelaId: r.tabelaId, tabelaNome: tn,
    });
  }
  return { tabelas, planos: [...porPlano.values()] };
}

/** Quantas propostas/clientes usam faixas da tabela (para impedir exclusão de tabelas em uso). */
export async function tabelaEmUso(tabelaId: string): Promise<boolean> {
  const r = await db.execute(sql`
    select (
      exists (select 1 from ${tabelasPrecoFaixasTable} f join clientes c on c.faixa_id = f.id where f.tabela_id = ${tabelaId})
      or exists (select 1 from ${tabelasPrecoFaixasTable} f join propostas p on p.faixa_id = f.id where f.tabela_id = ${tabelaId})
      or exists (select 1 from ${tabelasPrecoFaixasTable} f join dependentes d on d.faixa_id = f.id where f.tabela_id = ${tabelaId})
    ) as em_uso`);
  return Boolean((r.rows[0] as { em_uso?: boolean } | undefined)?.em_uso);
}
