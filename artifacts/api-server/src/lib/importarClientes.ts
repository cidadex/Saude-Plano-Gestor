import { randomUUID } from "crypto";
import { eq, sql, inArray } from "drizzle-orm";
import { db, clientesTable, dependentesTable, vendedoresTable, contratosTable, planosTable } from "@workspace/db";

export interface LinhaPessoa {
  nome?: string; cpf?: string; dataNascimento?: string; sexo?: string; telefone?: string; email?: string;
  cep?: string; logradouro?: string; numero?: string; bairro?: string; cidade?: string; estado?: string;
  nomeMae?: string; rg?: string; matricula?: string; planoCodigo?: string; valorMensal?: string | number;
  dataAtivacao?: string; formaPagamento?: string; diaVencimento?: string | number; grauParentesco?: string;
}
export interface LinhaImportacao {
  linha: number;
  vendedorId: string;
  contratoId?: string;
  titular: LinhaPessoa;
  dependentes: (LinhaPessoa & { linha: number })[];
}
export interface ResultadoImportacao {
  criados: number; atualizados: number; dependentes: number;
  erros: { linha: number; nome: string; erro: string }[];
}

const txt = (v: unknown) => { const s = String(v ?? "").trim(); return s ? s : null; };
const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const data = (v: unknown) => { const s = String(v ?? "").trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; };
const dinheiro = (v: unknown) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? n.toFixed(2) : null;
};
const sexo = (v: unknown): "M" | "F" | null => { const s = String(v ?? "").trim().toUpperCase()[0]; return s === "M" || s === "F" ? s : null; };
const cpfFmt = (d: string) => (d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : d);

function grau(v: unknown, sx: string | null) {
  const s = String(v ?? "").toUpperCase();
  if (/CONJ|ESPOS|MARIDO|COMPANH|CÔNJ/.test(s)) return "CONJUGE" as const;
  if (/FILH/.test(s)) return sx === "F" ? ("FILHA" as const) : ("FILHO" as const);
  if (/IRM/.test(s)) return sx === "F" ? ("IRMA" as const) : ("IRMAO" as const);
  if (/^MAE|^MÃE|PAI\/MAE/.test(s)) return s.startsWith("PAI") ? ("PAI" as const) : ("MAE" as const);
  if (/^PAI/.test(s)) return "PAI" as const;
  return "OUTRO" as const;
}

export async function importarClientes(linhas: LinhaImportacao[]): Promise<ResultadoImportacao> {
  const res: ResultadoImportacao = { criados: 0, atualizados: 0, dependentes: 0, erros: [] };
  const vIds = [...new Set(linhas.map(l => l.vendedorId).filter(Boolean))];
  const vOk = new Set(vIds.length ? (await db.select({ id: vendedoresTable.id }).from(vendedoresTable).where(inArray(vendedoresTable.id, vIds))).map(v => v.id) : []);
  const cIds = [...new Set(linhas.map(l => l.contratoId).filter((x): x is string => !!x))];
  const cOk = new Set(cIds.length ? (await db.select({ id: contratosTable.id }).from(contratosTable).where(inArray(contratosTable.id, cIds))).map(c => c.id) : []);
  const planos = await db.select({ id: planosTable.id, codigo: planosTable.codigo }).from(planosTable);
  const planoPorCodigo = new Map(planos.filter(p => p.codigo).map(p => [String(p.codigo), p.id]));

  for (const l of linhas) {
    const nome = txt(l.titular.nome) ?? "";
    try {
      const cpfD = soDigitos(l.titular.cpf);
      if (!nome || cpfD.length !== 11) throw new Error("Nome e CPF (11 dígitos) são obrigatórios");
      if (!vOk.has(l.vendedorId)) throw new Error("Selecione um vendedor válido");
      if (l.contratoId && !cOk.has(l.contratoId)) throw new Error("Contrato inválido");
      const t = l.titular;
      const codPlano = txt(t.planoCodigo);
      const valores = {
        vendedorId: l.vendedorId,
        nome: nome.toUpperCase(),
        dataNascimento: data(t.dataNascimento), sexo: sexo(t.sexo),
        telefone: txt(t.telefone), email: txt(t.email)?.toLowerCase() ?? null,
        cep: txt(t.cep), logradouro: txt(t.logradouro), numero: txt(t.numero), bairro: txt(t.bairro),
        cidade: txt(t.cidade), estado: txt(t.estado)?.toUpperCase() ?? null,
        nomeMae: txt(t.nomeMae), rg: txt(t.rg), matricula: txt(t.matricula)?.toUpperCase() ?? null,
        valorMensal: dinheiro(t.valorMensal), dataAtivacao: data(t.dataAtivacao),
        formaPagamento: txt(t.formaPagamento)?.toUpperCase() ?? null,
        diaVencimento: Number.isInteger(Number(t.diaVencimento)) && Number(t.diaVencimento) >= 1 && Number(t.diaVencimento) <= 31 ? Number(t.diaVencimento) : null,
        planoId: codPlano ? planoPorCodigo.get(codPlano) ?? null : null,
        planoCode: codPlano, codigoPlano: codPlano,
        contratoId: l.contratoId || null,
      };
      await db.transaction(async tx => {
        const [existente] = await tx.select({ id: clientesTable.id }).from(clientesTable)
          .where(sql`regexp_replace(${clientesTable.cpf}, '\\D', '', 'g') = ${cpfD}`).limit(1);
        let clienteId: string;
        if (existente) {
          // Atualiza apenas o que veio preenchido na planilha.
          const set = Object.fromEntries(Object.entries(valores).filter(([, v]) => v !== null && v !== undefined));
          await tx.update(clientesTable).set({ ...set, status: "ATIVO", updatedAt: new Date() }).where(eq(clientesTable.id, existente.id));
          clienteId = existente.id;
          await tx.delete(dependentesTable).where(eq(dependentesTable.clienteId, clienteId));
          res.atualizados++;
        } else {
          clienteId = randomUUID();
          await tx.insert(clientesTable).values({ id: clienteId, ...valores, cpf: cpfFmt(cpfD), status: "ATIVO", tipo: "TITULAR" });
          res.criados++;
        }
        for (const d of l.dependentes) {
          const dn = txt(d.nome);
          if (!dn) throw new Error(`Dependente na linha ${d.linha} sem nome`);
          const dsx = sexo(d.sexo);
          const dcpf = soDigitos(d.cpf);
          await tx.insert(dependentesTable).values({
            id: randomUUID(), clienteId, nome: dn.toUpperCase(),
            cpf: dcpf.length === 11 ? cpfFmt(dcpf) : null,
            dataNascimento: data(d.dataNascimento), sexo: dsx,
            grauParentesco: grau(d.grauParentesco, dsx),
            valorMensal: dinheiro(d.valorMensal),
          });
          res.dependentes++;
        }
      });
    } catch (err) {
      res.erros.push({ linha: l.linha, nome, erro: err instanceof Error ? err.message : String(err) });
    }
  }
  return res;
}
