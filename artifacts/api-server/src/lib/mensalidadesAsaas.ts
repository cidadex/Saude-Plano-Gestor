import { randomUUID } from "crypto";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import {
  db, boletosTable, clientesTable, contratosTable, dependentesTable, propostasTable, responsaveisFinanceirosTable,
} from "@workspace/db";
import { gerarComissaoMensalDoBoleto } from "./comissaoMensal.js";
import { criarCobranca, linhaDigitavel, obterOuCriarCliente, removerCobranca, type AsaasCreds } from "./asaas.js";
import { logger } from "./logger.js";

export interface EstadoJob {
  rodando: boolean; mes: string; total: number; processados: number;
  criados: number; jaExistentes: number; semContrato: number;
  erros: { clienteNome: string; erro: string }[];
  iniciadoEm: string | null; finalizadoEm: string | null;
}

const vazio = (): EstadoJob => ({
  rodando: false, mes: "", total: 0, processados: 0, criados: 0, jaExistentes: 0, semContrato: 0,
  erros: [], iniciadoEm: null, finalizadoEm: null,
});
let estado: EstadoJob = vazio();
export const estadoJob = () => estado;

export const mesAtual = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

function vencimentoDoMes(mes: string, dia: number | null): string {
  const [m, a] = mes.split("/").map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  const d = Math.min(Math.max(dia ?? 10, 1), ultimo);
  const alvo = new Date(a, m - 1, d);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const final = alvo < hoje ? hoje : alvo; // o Asaas recusa vencimento no passado
  return `${final.getFullYear()}-${String(final.getMonth() + 1).padStart(2, "0")}-${String(final.getDate()).padStart(2, "0")}`;
}

async function valorMensalDoCliente(clienteId: string, valorTitular: string | null): Promise<number> {
  const [proposta] = await db.select({ valorTotal: propostasTable.valorTotal }).from(propostasTable)
    .where(and(eq(propostasTable.clienteId, clienteId), eq(propostasTable.status, "ATIVA")))
    .orderBy(desc(propostasTable.dataAtivacao)).limit(1);
  const total = parseFloat(proposta?.valorTotal ?? "");
  if (Number.isFinite(total) && total > 0) return total;
  const deps = await db.select({ v: dependentesTable.valorMensal }).from(dependentesTable).where(eq(dependentesTable.clienteId, clienteId));
  return (parseFloat(valorTitular ?? "0") || 0) + deps.reduce((s, d) => s + (parseFloat(d.v ?? "0") || 0), 0);
}

/** Gera (em segundo plano) as mensalidades do mês no Asaas. Idempotente: pula clientes que já têm boleto no mês. */
export function iniciarGeracao(opts: { mes: string; contratoIds?: string[]; geradoPorId?: string | null }): { iniciado: boolean } {
  if (estado.rodando) return { iniciado: false };
  estado = { ...vazio(), rodando: true, mes: opts.mes, iniciadoEm: new Date().toISOString() };
  void executar(opts).catch(err => {
    logger.error({ err }, "Falha na geração de mensalidades");
    estado.erros.push({ clienteNome: "(geral)", erro: String(err) });
  }).finally(() => { estado.rodando = false; estado.finalizadoEm = new Date().toISOString(); });
  return { iniciado: true };
}

async function executar(opts: { mes: string; contratoIds?: string[]; geradoPorId?: string | null }) {
  const clientes = await db.select().from(clientesTable)
    .where(and(eq(clientesTable.status, "ATIVO"), ne(clientesTable.tipo, "DEPENDENTE")));
  const contratos = await db.select().from(contratosTable).where(eq(contratosTable.ativo, true));
  const credPorContrato = new Map(
    contratos.filter(c => c.asaasApiKey && (!opts.contratoIds || opts.contratoIds.includes(c.id)))
      .map(c => [c.id, { apiKey: c.asaasApiKey!, modo: c.asaasModo } as AsaasCreds]),
  );
  const alvo = clientes.filter(c => {
    if (opts.contratoIds && !(c.contratoId && opts.contratoIds.includes(c.contratoId))) return false;
    if (c.contratoId && credPorContrato.has(c.contratoId)) return true;
    estado.semContrato++;
    return false;
  });
  estado.total = alvo.length;

  const existentes = new Set(
    (await db.select({ c: boletosTable.clienteId }).from(boletosTable)
      .where(and(eq(boletosTable.mesReferencia, opts.mes), ne(boletosTable.status, "CANCELADO")))).map(b => b.c),
  );
  const respIds = [...new Set(alvo.map(c => c.responsavelFinanceiroId).filter((x): x is string => !!x))];
  const resps = new Map(
    (respIds.length ? await db.select().from(responsaveisFinanceirosTable).where(inArray(responsaveisFinanceirosTable.id, respIds)) : [])
      .map(r => [r.id, r]),
  );

  for (const c of alvo) {
    estado.processados++;
    if (existentes.has(c.id)) { estado.jaExistentes++; continue; }
    const creds = credPorContrato.get(c.contratoId!)!;
    let paymentId: string | null = null;
    try {
      const valor = await valorMensalDoCliente(c.id, c.valorMensal);
      if (valor <= 0) throw new Error("Cliente sem valor mensal definido");
      const resp = c.responsavelFinanceiroId ? resps.get(c.responsavelFinanceiroId) : undefined;
      const pagador = resp
        ? { nome: resp.nome, cpfCnpj: resp.cpfCnpj, email: resp.email, telefone: resp.telefone, cep: resp.cep, numero: resp.numero }
        : { nome: c.nome, cpfCnpj: c.cpf, email: c.email, telefone: c.telefone, cep: c.cep, numero: c.numero };
      if (pagador.cpfCnpj.replace(/\D/g, "").length < 11) throw new Error("CPF/CNPJ do pagador inválido");
      const customer = await obterOuCriarCliente(creds, { ...pagador, externalReference: c.id });
      const boletoId = `bol-${randomUUID()}`;
      const vencimento = vencimentoDoMes(opts.mes, c.diaVencimento);
      const cobranca = await criarCobranca(creds, {
        customer, valor, vencimento, externalReference: boletoId,
        descricao: `Mensalidade ${opts.mes} - ${c.nome}`,
      });
      paymentId = cobranca.id;
      const codigo = await linhaDigitavel(creds, cobranca.id);
      await db.insert(boletosTable).values({
        id: boletoId, clienteId: c.id, geradoPorId: opts.geradoPorId ?? null,
        valor: valor.toFixed(2), vencimento, status: "PENDENTE", mesReferencia: opts.mes,
        codigoBarras: codigo, linkPagamento: cobranca.bankSlipUrl ?? cobranca.invoiceUrl ?? null,
        asaasPaymentId: cobranca.id,
      });
      estado.criados++;
    } catch (err) {
      if (paymentId) await removerCobranca(credPorContrato.get(c.contratoId!)!, paymentId).catch(() => undefined);
      estado.erros.push({ clienteNome: c.nome, erro: err instanceof Error ? err.message : String(err) });
    }
  }
}

/** Marca o boleto como pago e gera a comissão mensal (mesma regra da baixa manual). */
export async function baixarBoleto(boletoId: string, dataPagamento?: string | null) {
  return db.transaction(async (tx) => {
    const [b] = await tx.select().from(boletosTable).where(eq(boletosTable.id, boletoId)).for("update").limit(1);
    if (!b || b.status === "CANCELADO") return null;
    if (b.status !== "PAGO") {
      await tx.update(boletosTable).set({
        status: "PAGO",
        dataPagamento: dataPagamento && /^\d{4}-\d{2}-\d{2}$/.test(dataPagamento) ? dataPagamento : new Date().toISOString().slice(0, 10),
      }).where(eq(boletosTable.id, boletoId));
    }
    return gerarComissaoMensalDoBoleto(tx, boletoId);
  });
}

/** Execução automática: só nos primeiros dias do mês, para contratos com emissão automática ligada. */
export async function execucaoAutomatica() {
  if (new Date().getDate() > 5) return;
  const auto = await db.select({ id: contratosTable.id }).from(contratosTable)
    .where(and(eq(contratosTable.ativo, true), eq(contratosTable.asaasEmissaoAutomatica, true)));
  if (!auto.length) return;
  const r = iniciarGeracao({ mes: mesAtual(), contratoIds: auto.map(a => a.id) });
  if (r.iniciado) logger.info({ contratos: auto.length }, "Geração automática de mensalidades iniciada");
}
