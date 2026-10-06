import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import {
  db, clientesTable, dependentesTable, vendedoresTable, planosTable, usersTable,
  responsaveisFinanceirosTable, propostasTable, boletosTable, comissoesTable, comunicacoesTable,
} from "@workspace/db";

/** Linha da planilha Vitalgestor, indexada pelo nome da coluna. */
export type LinhaVital = Record<string, string>;

export interface RelatorioVital {
  titulares: number;
  dependentes: number;
  responsaveis: number;
  vendedoresCriados: string[];
  removidos: { clientes: number; dependentes: number; propostas: number; boletos: number; comissoes: number; responsaveis: number } | null;
  avisos: string[];
  erros: { cpf: string; nome: string; erro: string }[];
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const txt = (v: unknown) => { const s = String(v ?? "").trim(); return s || null; };
const digitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const cpf11 = (v: unknown) => { const d = digitos(v); return d && d.length <= 11 ? d.padStart(11, "0") : d; };
const cpfFmt = (d: string) => d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

function dataIso(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{4,6}(\.\d+)?$/.test(s)) { // serial do Excel
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const br = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  return br ? `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}` : null;
}
function dinheiro(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}
const sexo = (v: unknown): "M" | "F" | null => { const c = String(v ?? "").trim().toUpperCase()[0]; return c === "M" || c === "F" ? c : null; };

function grau(v: unknown, sx: "M" | "F" | null) {
  const s = String(v ?? "").toUpperCase();
  if (/CONJ|ESPOS|MARIDO|COMPANH/.test(s)) return "CONJUGE" as const;
  if (/FILH/.test(s)) return sx === "F" ? ("FILHA" as const) : ("FILHO" as const);
  if (/IRM/.test(s)) return sx === "F" ? ("IRMA" as const) : ("IRMAO" as const);
  if (/^PAI\/MAE|^MAE|^MÃE/.test(s)) return "MAE" as const;
  if (/^PAI/.test(s)) return "PAI" as const;
  return "OUTRO" as const;
}
function formaPagamento(v: string | null) {
  const s = (v ?? "").toUpperCase();
  if (s.includes("PIX")) return "PIX";
  if (s.includes("BOLETO")) return "BOLETO";
  if (s.includes("CART")) return "CARTAO";
  return null;
}

export async function importarVitalgestor(brutas: LinhaVital[], opts: { substituir: boolean }): Promise<RelatorioVital> {
  const rel: RelatorioVital = { titulares: 0, dependentes: 0, responsaveis: 0, vendedoresCriados: [], removidos: null, avisos: [], erros: [] };

  // normaliza as chaves das colunas
  const linhas = brutas
    .map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [norm(k), String(v ?? "").trim()])) as Record<string, string>)
    .filter(r => r.usuario && r.cpf);

  // agrupa pelo CPF do titular (coluna CPF); o titular é a linha com TIPO USUARIO = TITULAR
  const grupos = new Map<string, { titular?: Record<string, string>; deps: Record<string, string>[] }>();
  for (const r of linhas) {
    const k = cpf11(r.cpf);
    const g = grupos.get(k) ?? { deps: [] };
    if (norm(r.tipousuario).startsWith("titular")) {
      if (g.titular) rel.avisos.push(`CPF ${k}: titular repetido (${r.usuario}) — mantida a primeira ocorrência`);
      else g.titular = r;
    } else g.deps.push(r);
    grupos.set(k, g);
  }

  await db.transaction(async tx => {
    if (opts.substituir) {
      const cont = async (t: string) => Number((await tx.execute(sql.raw(`select count(*)::int as n from ${t}`))).rows[0]?.n ?? 0);
      const antes = {
        clientes: await cont("clientes"), dependentes: await cont("dependentes"), propostas: await cont("propostas"),
        boletos: await cont("boletos"), comissoes: await cont("comissoes"), responsaveis: await cont("responsaveis_financeiros"),
      };
      await tx.delete(comunicacoesTable);
      await tx.delete(comissoesTable);
      await tx.delete(boletosTable);
      await tx.delete(dependentesTable);
      await tx.delete(propostasTable);
      const clientesUsers = (await tx.select({ id: clientesTable.userId }).from(clientesTable)).map(c => c.id).filter((x): x is string => !!x);
      await tx.delete(clientesTable);
      const respUsers = (await tx.select({ id: responsaveisFinanceirosTable.userId }).from(responsaveisFinanceirosTable)).map(c => c.id).filter((x): x is string => !!x);
      await tx.delete(responsaveisFinanceirosTable);
      for (const uid of [...clientesUsers, ...respUsers]) await tx.delete(usersTable).where(eq(usersTable.id, uid));
      rel.removidos = antes;
    }

    // vendedores: casa pelo nome; cria os que não existirem (sem acesso até o admin definir e-mail/senha)
    const vend = await tx.select({ id: vendedoresTable.id, nome: vendedoresTable.nome }).from(vendedoresTable);
    const vendPorNome = new Map(vend.map(v => [norm(v.nome), v.id]));
    const garantirVendedor = async (nomeBruto: string): Promise<string> => {
      const nome = nomeBruto.trim().toUpperCase();
      const achado = vendPorNome.get(norm(nome));
      if (achado) return achado;
      const userId = randomUUID();
      const vendedorId = randomUUID();
      const email = `${norm(nome) || "vendedor"}.${vendedorId.slice(0, 6)}@importado.local`;
      await tx.insert(usersTable).values({ id: userId, email, passwordHash: await bcrypt.hash(randomUUID(), 10), role: "vendedor", nome, active: true });
      await tx.insert(vendedoresTable).values({ id: vendedorId, userId, nome, email });
      vendPorNome.set(norm(nome), vendedorId);
      rel.vendedoresCriados.push(nome);
      return vendedorId;
    };

    const planos = await tx.select({ id: planosTable.id, codigo: planosTable.codigo }).from(planosTable);
    const planoPorCodigo = new Map(planos.filter(p => p.codigo).map(p => [String(p.codigo), p.id]));
    const planosAusentes = new Set<string>();

    for (const [cpfTit, g] of grupos) {
      const t = g.titular;
      const nomeRef = t?.usuario ?? g.deps[0]?.usuario ?? "";
      if (!t) { rel.erros.push({ cpf: cpfTit, nome: nomeRef, erro: "Grupo sem linha de TITULAR" }); continue; }
      if (cpfTit.length !== 11) { rel.erros.push({ cpf: cpfTit, nome: t.usuario, erro: "CPF do titular inválido" }); continue; }
      const nome = t.usuario.toUpperCase();
      try {
        const vendedorId = await garantirVendedor(t.vendedor || "SEM VENDEDOR");
        const cod = txt(t.plano);
        if (cod && !planoPorCodigo.has(cod)) planosAusentes.add(cod);
        const logradouro = [txt(t.tipologradouro), txt(t.logradouro)].filter(Boolean).join(" ") || null;
        const telefone = txt(t.celular) ?? txt(t.fone);
        const pgto = txt(t.pagamento);
        const dia = Number(t.vencimento);
        const obs = [t.empresa && `Empresa: ${t.empresa}`, pgto && `Pagamento: ${pgto}`].filter(Boolean).join(" · ") || null;
        const end = {
          telefone, cep: txt(t.cep), logradouro, numero: txt(t.numero), complemento: txt(t.complemento),
          bairro: txt(t.bairro), cidade: txt(t.cidade), estado: txt(t.ufendereco)?.toUpperCase() ?? null,
        };

        const respId = randomUUID();
        await tx.insert(responsaveisFinanceirosTable).values({
          id: respId, tipo: "PF", nome, cpfCnpj: cpfTit, ...end,
        }).onConflictDoNothing({ target: responsaveisFinanceirosTable.cpfCnpj });
        const [resp] = await tx.select({ id: responsaveisFinanceirosTable.id }).from(responsaveisFinanceirosTable).where(eq(responsaveisFinanceirosTable.cpfCnpj, cpfTit));
        if (resp!.id === respId) rel.responsaveis++;

        const clienteId = randomUUID();
        await tx.insert(clientesTable).values({
          id: clienteId, vendedorId, nome, cpf: cpfFmt(cpfTit), tipo: "TITULAR", status: "ATIVO",
          dataNascimento: dataIso(t.datanascimento), sexo: sexo(t.sexo), ...end,
          nomeMae: txt(t.nomemae), rg: txt(t.identidade), rgOrgaoEmissor: txt(t.orgaoexp), rgUf: txt(t.uforgao),
          estadoCivil: txt(t.estadocivil),
          matricula: txt(t.codigousuario)?.toUpperCase() ?? null,
          planoId: cod ? planoPorCodigo.get(cod) ?? null : null, planoCode: cod, codigoPlano: cod,
          valorMensal: dinheiro(t.valor), dataAtivacao: dataIso(t.dtadmissao),
          formaPagamento: formaPagamento(pgto), diaVencimento: Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null,
          comissaoMensal: dinheiro(t.comissao), observacao: obs,
          responsavelFinanceiroId: resp!.id,
        });
        rel.titulares++;

        for (const d of g.deps) {
          const dsx = sexo(d.sexo);
          const dcpf = cpf11(d.cpfdependente);
          await tx.insert(dependentesTable).values({
            id: randomUUID(), clienteId, nome: d.usuario.toUpperCase(),
            cpf: dcpf.length === 11 ? cpfFmt(dcpf) : null,
            dataNascimento: dataIso(d.datanascimento), sexo: dsx, grauParentesco: grau(d.grauparentesco, dsx),
            planoId: txt(d.plano) ? planoPorCodigo.get(d.plano) ?? null : null,
            valorMensal: dinheiro(d.valor),
          });
          rel.dependentes++;
        }
      } catch (err) {
        throw new Error(`Titular ${nome} (${cpfTit}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (planosAusentes.size) rel.avisos.push(`Códigos de plano sem cadastro no sistema (ficaram sem plano vinculado): ${[...planosAusentes].join(", ")}`);
  });
  return rel;
}
