import { readSheet } from "read-excel-file/browser";

export const CAMPOS = [
  { key: "nome", label: "Nome", alias: ["nome", "beneficiario", "cliente", "segurado", "usuario"] },
  { key: "cpf", label: "CPF", alias: ["cpf"] },
  { key: "tipo", label: "Tipo (titular/dependente)", alias: ["tipo", "tipobeneficiario", "tipousuario"] },
  { key: "cpfTitular", label: "CPF do titular (dependentes)", alias: ["cpftitular", "cpfdotitular", "titular"] },
  { key: "grauParentesco", label: "Vínculo / parentesco", alias: ["parentesco", "vinculo", "grau", "graudeparentesco"] },
  { key: "dataNascimento", label: "Data de nascimento", alias: ["nascimento", "datanascimento", "dtnasc", "datadenascimento"] },
  { key: "sexo", label: "Sexo", alias: ["sexo", "genero"] },
  { key: "telefone", label: "Telefone", alias: ["telefone", "celular", "fone", "whatsapp"] },
  { key: "email", label: "E-mail", alias: ["email", "emailcliente"] },
  { key: "cep", label: "CEP", alias: ["cep"] },
  { key: "logradouro", label: "Logradouro", alias: ["logradouro", "endereco", "rua"] },
  { key: "numero", label: "Número", alias: ["numero", "num"] },
  { key: "bairro", label: "Bairro", alias: ["bairro"] },
  { key: "cidade", label: "Cidade", alias: ["cidade", "municipio"] },
  { key: "estado", label: "UF", alias: ["uf", "estado"] },
  { key: "nomeMae", label: "Nome da mãe", alias: ["mae", "nomemae", "nomedamae"] },
  { key: "rg", label: "RG", alias: ["rg", "identidade"] },
  { key: "matricula", label: "Código do usuário", alias: ["matricula", "codigousuario", "codigodousuario", "carteirinha", "codigo"] },
  { key: "planoCodigo", label: "Código do plano", alias: ["codigoplano", "codplano", "plano", "codigodoplano"] },
  { key: "valorMensal", label: "Valor mensal", alias: ["valor", "valormensal", "mensalidade"] },
  { key: "dataAtivacao", label: "Data de ativação", alias: ["ativacao", "dataativacao", "vigencia", "datavigencia", "inicio"] },
  { key: "formaPagamento", label: "Forma de pagamento", alias: ["formapagamento", "pagamento"] },
  { key: "diaVencimento", label: "Dia de vencimento", alias: ["vencimento", "diavencimento", "diadevencimento"] },
  { key: "vendedor", label: "Vendedor (nome, p/ vincular)", alias: ["vendedor", "consultor", "representante", "corretor"] },
] as const;
export type CampoKey = (typeof CAMPOS)[number]["key"];
export type Mapeamento = Partial<Record<CampoKey, number>>;

export const normaliza = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function lerPlanilha(file: File): Promise<{ cabecalho: string[]; linhas: unknown[][] }> {
  const rows = (await readSheet(file)) as unknown[][];
  if (rows.length < 2) throw new Error("A planilha precisa ter um cabeçalho e ao menos uma linha de dados");
  const cabecalho = rows[0].map((c, i) => String(c ?? "").trim() || `Coluna ${i + 1}`);
  return { cabecalho, linhas: rows.slice(1).filter(r => r.some(c => String(c ?? "").trim() !== "")) };
}

export function autoMapear(cabecalho: string[]): Mapeamento {
  const m: Mapeamento = {};
  const usados = new Set<number>();
  // Alias exato primeiro, evitando reutilizar a mesma coluna.
  for (const c of CAMPOS) {
    const i = cabecalho.findIndex((h, idx) => !usados.has(idx) && c.alias.includes(normaliza(h) as never));
    if (i >= 0) { m[c.key] = i; usados.add(i); }
  }
  return m;
}

const pad = (n: number) => String(n).padStart(2, "0");
export function paraIso(v: unknown): string {
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  const s = String(v ?? "").trim();
  const br = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (br) return `${br[3].length === 2 ? "19" + br[3] : br[3]}-${pad(+br[2])}-${pad(+br[1])}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
}
export function textoCelula(v: unknown): string {
  if (v instanceof Date) return paraIso(v);
  return String(v ?? "").trim();
}
