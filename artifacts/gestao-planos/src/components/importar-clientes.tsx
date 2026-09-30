import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { CAMPOS, autoMapear, lerPlanilha, normaliza, paraIso, textoCelula, type CampoKey, type Mapeamento } from "@/lib/importar-planilha";
import { Loader2, Upload, X } from "lucide-react";

type Opcao = { id: string; nome: string };
type Linha = {
  n: number; dep: boolean; vendedorId: string; vendedorTexto: string;
} & Record<Exclude<CampoKey, "vendedor">, string>;
type Resultado = { criados: number; atualizados: number; dependentes: number; erros: { linha: number; nome: string; erro: string }[] };

const COLUNAS: { key: Exclude<CampoKey, "vendedor">; titulo: string; w: string }[] = [
  { key: "nome", titulo: "Nome", w: "w-56" }, { key: "cpf", titulo: "CPF", w: "w-36" },
  { key: "dataNascimento", titulo: "Nascimento", w: "w-32" }, { key: "telefone", titulo: "Telefone", w: "w-32" },
  { key: "matricula", titulo: "Cód. usuário", w: "w-36" }, { key: "planoCodigo", titulo: "Plano", w: "w-24" },
  { key: "valorMensal", titulo: "Valor", w: "w-24" }, { key: "grauParentesco", titulo: "Vínculo", w: "w-28" },
];

function montarLinhas(linhas: unknown[][], map: Mapeamento, vendedores: Opcao[]): Linha[] {
  const get = (r: unknown[], k: CampoKey) => (map[k] === undefined ? "" : textoCelula(r[map[k]!]));
  return linhas.map((r, i) => {
    const base = Object.fromEntries(CAMPOS.filter(c => c.key !== "vendedor").map(c => [c.key, get(r, c.key)])) as Record<Exclude<CampoKey, "vendedor">, string>;
    base.dataNascimento = paraIso(base.dataNascimento);
    base.dataAtivacao = paraIso(base.dataAtivacao);
    const digitos = base.cpf.replace(/\D/g, "");
    if (digitos.length >= 9 && digitos.length < 11) base.cpf = digitos.padStart(11, "0");
    const tipo = base.tipo.toUpperCase();
    const dep = map.tipo !== undefined ? tipo.includes("DEP") : base.grauParentesco !== "" && !/TITULAR/.test(base.grauParentesco.toUpperCase());
    const vt = get(r, "vendedor");
    const v = vt ? vendedores.find(x => normaliza(x.nome) === normaliza(vt)) : undefined;
    return { n: i + 2, dep, vendedorId: v?.id ?? "", vendedorTexto: vt, ...base };
  });
}

function erroLinha(l: Linha, todas: Linha[], idx: number): string {
  if (!l.nome.trim()) return "Nome obrigatório";
  if (!l.dep) {
    if (l.cpf.replace(/\D/g, "").length !== 11) return "CPF inválido";
    if (!l.vendedorId) return "Selecione o vendedor";
  } else if (!l.cpfTitular.trim() && !todas.slice(0, idx).some(x => !x.dep)) return "Dependente sem titular";
  return "";
}

export function ImportarClientesDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [cabecalho, setCabecalho] = useState<string[]>([]);
  const [brutas, setBrutas] = useState<unknown[][]>([]);
  const [map, setMap] = useState<Mapeamento>({});
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [vendedores, setVendedores] = useState<Opcao[]>([]);
  const [contratos, setContratos] = useState<Opcao[]>([]);
  const [contratoId, setContratoId] = useState("");
  const [vendedorLote, setVendedorLote] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiFetch<{ vendedores: Opcao[] }>("/admin/vendedores"),
      apiFetch<{ contratos: (Opcao & { ativo?: boolean })[] }>("/admin/contratos"),
    ]).then(([v, c]) => { setVendedores(v.vendedores ?? []); setContratos((c.contratos ?? []).filter(x => x.ativo !== false)); })
      .catch(e => setErro(String(e)));
  }, [open]);

  const fechar = () => {
    setPasso(1); setCabecalho([]); setBrutas([]); setMap({}); setLinhas([]); setContratoId(""); setVendedorLote("");
    setErro(""); setResultado(null); onClose();
  };

  const aoEscolherArquivo = async (f: File | undefined) => {
    if (!f) return;
    setErro("");
    try {
      const { cabecalho: c, linhas: l } = await lerPlanilha(f);
      setCabecalho(c); setBrutas(l); setMap(autoMapear(c));
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  };

  const avancar = () => {
    if (map.nome === undefined || map.cpf === undefined) { setErro("Mapeie ao menos as colunas Nome e CPF"); return; }
    setErro(""); setLinhas(montarLinhas(brutas, map, vendedores)); setPasso(2);
  };

  const erros = useMemo(() => linhas.map((l, i) => erroLinha(l, linhas, i)), [linhas]);
  const totalErros = erros.filter(Boolean).length;
  const edit = (i: number, patch: Partial<Linha>) => setLinhas(a => a.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const aplicarLote = () => {
    if (!vendedorLote) return;
    setLinhas(a => a.map(l => (!l.dep && !l.vendedorId ? { ...l, vendedorId: vendedorLote } : l)));
  };

  const importar = async () => {
    setEnviando(true); setErro("");
    try {
      const grupos: { linha: number; vendedorId: string; contratoId?: string; titular: Linha; dependentes: (Linha & { linha: number })[] }[] = [];
      for (const l of linhas) {
        if (!l.dep) { grupos.push({ linha: l.n, vendedorId: l.vendedorId, contratoId: contratoId || undefined, titular: l, dependentes: [] }); continue; }
        const cpfT = l.cpfTitular.replace(/\D/g, "");
        const alvo = cpfT ? grupos.find(g => g.titular.cpf.replace(/\D/g, "") === cpfT) : grupos[grupos.length - 1];
        if (!alvo) throw new Error(`Linha ${l.n}: titular do dependente não encontrado`);
        alvo.dependentes.push({ ...l, linha: l.n });
      }
      const r = await apiFetch<Resultado>("/admin/clientes/importar", { method: "POST", body: JSON.stringify({ linhas: grupos }) });
      setResultado(r); setPasso(3); onDone();
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); } finally { setEnviando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) fechar(); }}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar beneficiários via Excel</DialogTitle>
          <DialogDescription>
            {passo === 1 && "1. Envie a planilha (.xlsx) e confira a ligação das colunas."}
            {passo === 2 && "2. Revise, edite os dados e vincule o vendedor. CPF já cadastrado será atualizado."}
            {passo === 3 && "3. Resultado da importação."}
          </DialogDescription>
        </DialogHeader>

        {passo === 1 && (
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 text-sm hover:bg-muted/40">
              <Upload className="h-4 w-4" />
              <span>{cabecalho.length ? `${brutas.length} linhas lidas. Clique para trocar o arquivo.` : "Escolher arquivo .xlsx"}</span>
              <input type="file" accept=".xlsx" className="hidden" data-testid="input-importar-arquivo" onChange={e => void aoEscolherArquivo(e.target.files?.[0])} />
            </label>
            {cabecalho.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CAMPOS.map(c => (
                  <div key={c.key} className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">{c.label}{(c.key === "nome" || c.key === "cpf") && " *"}</label>
                    <Select value={map[c.key] === undefined ? "NONE" : String(map[c.key])}
                      onValueChange={v => setMap(m => { const n = { ...m }; if (v === "NONE") delete n[c.key]; else n[c.key] = Number(v); return n; })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">— não importar —</SelectItem>
                        {cabecalho.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Vendedor para os que estão sem vendedor</label>
                <Select value={vendedorLote} onValueChange={setVendedorLote}>
                  <SelectTrigger className="w-64 bg-background"><SelectValue placeholder="Escolha..." /></SelectTrigger>
                  <SelectContent>{vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={aplicarLote} disabled={!vendedorLote}>Aplicar</Button>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Contrato (opcional, todos)</label>
                <Select value={contratoId || "NONE"} onValueChange={v => setContratoId(v === "NONE" ? "" : v)}>
                  <SelectTrigger className="w-56 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sem contrato</SelectItem>
                    {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto text-sm">
                {linhas.length} linhas · {linhas.filter(l => l.dep).length} dependentes ·{" "}
                <span className={totalErros ? "text-red-600 font-semibold" : "text-emerald-600"}>{totalErros} com pendência</span>
              </div>
            </div>
            <div className="overflow-auto max-h-[52vh] rounded-lg border">
              <table className="text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="p-2 text-left">Lin.</th><th className="p-2 text-left">Tipo</th>
                    {COLUNAS.map(c => <th key={c.key} className="p-2 text-left whitespace-nowrap">{c.titulo}</th>)}
                    <th className="p-2 text-left">Vendedor</th><th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={l.n} className={erros[i] ? "bg-red-50/60 dark:bg-red-950/20" : ""}>
                      <td className="p-1 text-xs text-muted-foreground">{l.n}</td>
                      <td className="p-1"><Badge variant="outline" className="cursor-pointer" onClick={() => edit(i, { dep: !l.dep })}>{l.dep ? "Dep." : "Titular"}</Badge></td>
                      {COLUNAS.map(c => (
                        <td key={c.key} className="p-1"><Input className={`h-8 ${c.w}`} value={l[c.key]} onChange={e => edit(i, { [c.key]: e.target.value })} /></td>
                      ))}
                      <td className="p-1">
                        {l.dep ? <span className="text-xs text-muted-foreground">do titular</span> : (
                          <Select value={l.vendedorId || "NONE"} onValueChange={v => edit(i, { vendedorId: v === "NONE" ? "" : v })}>
                            <SelectTrigger className="h-8 w-44"><SelectValue placeholder={l.vendedorTexto || "Selecione"} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">— selecione —</SelectItem>
                              {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        {erros[i] && <p className="text-[11px] text-red-600">{erros[i]}</p>}
                      </td>
                      <td className="p-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setLinhas(a => a.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {passo === 3 && resultado && (
          <div className="space-y-3 text-sm">
            <p><strong>{resultado.criados}</strong> criados · <strong>{resultado.atualizados}</strong> atualizados · <strong>{resultado.dependentes}</strong> dependentes.</p>
            {resultado.erros.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 space-y-1">
                <p className="font-semibold">{resultado.erros.length} linhas não importadas:</p>
                {resultado.erros.map((e, i) => <p key={i}>Linha {e.linha} {e.nome && `(${e.nome})`}: {e.erro}</p>)}
              </div>
            )}
          </div>
        )}

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <DialogFooter>
          {passo === 1 && <><Button variant="ghost" onClick={fechar}>Cancelar</Button><Button onClick={avancar} disabled={!cabecalho.length}>Revisar dados</Button></>}
          {passo === 2 && <><Button variant="ghost" onClick={() => setPasso(1)}>Voltar</Button>
            <Button onClick={() => void importar()} disabled={enviando || totalErros > 0 || linhas.length === 0} data-testid="btn-confirmar-importacao">
              {enviando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Importar {linhas.length} linhas</Button></>}
          {passo === 3 && <Button onClick={fechar}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
