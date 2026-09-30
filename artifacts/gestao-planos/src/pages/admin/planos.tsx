import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Pencil, PauseCircle, PlayCircle, Check, AlertTriangle, Loader2, RefreshCw, Plus, Trash2, X, Link2, UserCheck, UserX } from "lucide-react";

type PlanoAPI = {
  id: string;
  codigo: string | null;
  nome: string;
  tipo: string;
  categoria: string | null;
  acomodacao: string | null;
  valorTitular: string | null;
  valorDependente: string | null;
  coberturas: string | null;
  ativo: boolean;
  operadora: string;
};

type TabelaFaixa = {
  id: string;
  faixaEtaria: string;
  valor: string;
  valorApartamento: string | null;
  planoId: string;
};

type TabelaPreco = {
  id: string;
  nome: string;
  tipoPlano: string | null;
  ano: number | null;
  vendedorId: string | null;
  vendedorNome: string | null;
  vendedores: { id: string; nome: string }[];
  emUso?: boolean;
  faixas: TabelaFaixa[];
};

type FaixaForm = {
  faixaEtaria: string;
  valor: string;
  valorApartamento: string;
  planoId: string;
};

const categoriaCor: Record<string, string> = {
  "NOSSO PLANO": "border-blue-300 bg-blue-50 text-blue-700",
  "MIX": "border-teal-300 bg-teal-50 text-teal-700",
  "PLENO": "border-purple-300 bg-purple-50 text-purple-700",
};

const CATEGORIAS = ["NOSSO PLANO", "MIX", "PLENO"];


function TabelaModal({
  open, onClose, tabela, planos, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  tabela?: TabelaPreco;
  planos: PlanoAPI[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!tabela;

  const [form, setForm] = useState({
    nome: tabela?.nome ?? "",
    tipoPlano: tabela?.tipoPlano ?? "",
    ano: tabela?.ano ? String(tabela.ano) : String(new Date().getFullYear()),
  });

  const [faixas, setFaixas] = useState<FaixaForm[]>(
    (tabela?.faixas ?? []).map(f => ({
      faixaEtaria: f.faixaEtaria,
      valor: f.valor,
      valorApartamento: f.valorApartamento ?? "",
      planoId: f.planoId,
    })),
  );
  const [vendedorIds, setVendedorIds] = useState<string[]>(tabela?.vendedores?.map(v => v.id) ?? []);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  const [planoAtual, setPlanoAtual] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiFetch<{ vendedores: { id: string; nome: string }[] }>("/admin/vendedores-para-tabela")
      .then(d => setVendedores(d.vendedores))
      .catch(err => toast({ variant: "destructive", title: String(err) }));
  }, [open, toast]);

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const planosConfigurados = [...new Set(faixas.map(f => f.planoId).filter(Boolean))];
  const linhas = faixas.map((f, i) => ({ f, i })).filter(x => x.f.planoId === planoAtual);

  const setFaixa = (i: number, k: keyof FaixaForm, v: string) =>
    setFaixas(prev => prev.map((f, idx) => idx === i ? { ...f, [k]: v } : f));

  const addFaixa = () => {
    if (!planoAtual) { toast({ variant: "destructive", title: "Escolha primeiro o plano que está configurando" }); return; }
    setFaixas(prev => [...prev, { faixaEtaria: "", valor: "", valorApartamento: "", planoId: planoAtual }]);
  };

  const removeFaixa = (i: number) => setFaixas(prev => prev.filter((_, idx) => idx !== i));

  const removerPlano = (planoId: string) => {
    setFaixas(prev => prev.filter(f => f.planoId !== planoId));
    if (planoAtual === planoId) setPlanoAtual("");
  };

  const toggleVendedor = (id: string) =>
    setVendedorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async (): Promise<void> => {
    if (!form.nome.trim()) { toast({ variant: "destructive", title: "Informe o nome da tabela" }); return; }

    const validFaixas = faixas.filter(f => f.faixaEtaria.trim() || f.valor);
    const incompleta = validFaixas.find(f => !f.faixaEtaria.trim() || !f.valor || !f.planoId);
    if (incompleta) { toast({ variant: "destructive", title: "Preencha faixa etária e valor em todas as linhas (ou remova a linha)" }); return; }
    const vistos = new Set<string>();
    for (const f of validFaixas) {
      const k = `${f.planoId}|${f.faixaEtaria.trim().toLowerCase()}`;
      if (vistos.has(k)) { toast({ variant: "destructive", title: `Faixa "${f.faixaEtaria}" duplicada no mesmo plano` }); return; }
      vistos.add(k);
    }
    if (validFaixas.length === 0) { toast({ variant: "destructive", title: "Configure ao menos um plano com faixas e valores" }); return; }

    setSaving(true);
    try {
      const body = {
        nome: form.nome,
        tipoPlano: form.tipoPlano || null,
        ano: form.ano ? parseInt(form.ano) : null,
        vendedorIds,
        faixas: validFaixas.map(f => ({
          faixaEtaria: f.faixaEtaria.trim(),
          valor: f.valor.replace(",", "."),
          planoId: f.planoId,
        })),
      };

      if (isEdit) {
        await apiFetch(`/admin/tabelas-preco/${tabela.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast({ title: "Tabela atualizada com sucesso" });
      } else {
        await apiFetch("/admin/tabelas-preco", { method: "POST", body: JSON.stringify(body) });
        toast({ title: "Tabela criada com sucesso" });
      }
      onSaved();
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const activePlanos = planos.filter(p => p.ativo);
  const nomePlano = (id: string) => {
    const p = planos.find(x => x.id === id);
    return p ? `${p.codigo ?? ""} ${p.nome}`.trim() : id;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Tabela de Preço" : "Nova Tabela de Preço"}</DialogTitle>
          <DialogDescription>
            Defina os vendedores que usam a tabela e configure um plano por vez, com suas faixas etárias e valores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome da tabela *</Label>
            <Input value={form.nome} onChange={e => setField("nome", e.target.value)} placeholder="Ex: Tabela Comercial Fortaleza 2026" data-testid="input-nome-tabela" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo do plano</Label>
              <Input value={form.tipoPlano} onChange={e => setField("tipoPlano", e.target.value)} placeholder="Ex: NOSSO PLANO" />
            </div>
            <div className="space-y-1.5">
              <Label>Ano de vigência</Label>
              <Input type="number" value={form.ano} onChange={e => setField("ano", e.target.value)} placeholder="2026" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Vendedores que usam esta tabela</Label>
            <div className="rounded-md border max-h-36 overflow-y-auto divide-y" data-testid="lista-vendedores-tabela">
              {vendedores.map(v => (
                <label key={v.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/40">
                  <input type="checkbox" checked={vendedorIds.includes(v.id)} onChange={() => toggleVendedor(v.id)} />
                  {v.nome}
                </label>
              ))}
              {vendedores.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum vendedor cadastrado.</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Plano, faixas etárias e valores</Label>
            {planosConfigurados.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {planosConfigurados.map(pid => (
                  <Badge
                    key={pid}
                    variant={pid === planoAtual ? "default" : "outline"}
                    className="cursor-pointer gap-1"
                    onClick={() => setPlanoAtual(pid)}
                  >
                    {nomePlano(pid).slice(0, 34)}
                    <X className="h-3 w-3 opacity-70 hover:opacity-100" onClick={e => { e.stopPropagation(); removerPlano(pid); }} />
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Select value={planoAtual} onValueChange={setPlanoAtual}>
                <SelectTrigger className="h-9 text-sm" data-testid="select-plano-atual">
                  <SelectValue placeholder="Escolha o plano que quer configurar..." />
                </SelectTrigger>
                <SelectContent>
                  {activePlanos.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <span className="font-mono mr-1">{p.codigo}</span> {p.nome.slice(0, 40)}
                      {planosConfigurados.includes(p.id) ? " ✓" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={addFaixa} className="gap-1 h-9 shrink-0" data-testid="btn-add-faixa">
                <Plus className="h-3 w-3" /> Adicionar faixa
              </Button>
            </div>
            {planoAtual && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Faixa etária</TableHead>
                      <TableHead className="text-xs text-right">Valor (R$)</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map(({ f, i }) => (
                      <TableRow key={i}>
                        <TableCell className="p-1.5">
                          <Input
                            value={f.faixaEtaria}
                            onChange={e => setFaixa(i, "faixaEtaria", e.target.value)}
                            placeholder="Ex: Até 29 anos"
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Input
                            value={f.valor}
                            onChange={e => setFaixa(i, "valor", e.target.value)}
                            placeholder="0,00"
                            className="h-8 text-xs font-mono text-right"
                          />
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Button
                            type="button" variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            onClick={() => removeFaixa(i)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {linhas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-sm text-muted-foreground">
                          Nenhuma faixa neste plano. Clique em "Adicionar faixa".
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void handleSave()} disabled={saving} data-testid="btn-salvar-tabela">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : isEdit ? "Salvar alterações" : "Criar tabela"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPlanos() {
  const { toast } = useToast();
  const [planos, setPlanos] = useState<PlanoAPI[]>([]);
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([]);
  const [loading, setLoading] = useState(true);

  const [planoEditando, setPlanoEditando] = useState<PlanoAPI | null>(null);
  const [valorTitularEdit, setValorTitularEdit] = useState("");
  const [valorDependenteEdit, setValorDependenteEdit] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const [planoSuspendendo, setPlanoSuspendendo] = useState<PlanoAPI | null>(null);
  const [suspendendo, setSuspendendo] = useState(false);

  const [tabelaModalOpen, setTabelaModalOpen] = useState(false);
  const [tabelaEditando, setTabelaEditando] = useState<TabelaPreco | undefined>();
  const [tabelaExcluindo, setTabelaExcluindo] = useState<TabelaPreco | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Vincular vendedor
  const [vincularTabela, setVincularTabela] = useState<TabelaPreco | null>(null);
  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState<{ id: string; nome: string }[]>([]);
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState<string[]>([]);
  const [vinculando, setVinculando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [dadosPlanos, dadosTabelas] = await Promise.all([
        apiFetch("/admin/planos") as Promise<{ planos: PlanoAPI[] }>,
        apiFetch("/admin/tabelas-preco") as Promise<{ tabelas: TabelaPreco[] }>,
      ]);
      setPlanos(dadosPlanos.planos ?? []);
      setTabelas(dadosTabelas.tabelas ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleAbrirEdicao = (plano: PlanoAPI) => {
    setPlanoEditando(plano);
    setValorTitularEdit((plano.valorTitular ?? "0").replace(".", ","));
    setValorDependenteEdit((plano.valorDependente ?? "0").replace(".", ","));
    setSalvo(false);
  };

  const handleSalvarEdicao = async () => {
    if (!planoEditando) return;
    setSalvando(true);
    try {
      await apiFetch(`/admin/planos/${planoEditando.id}`, {
        method: "PUT",
        body: JSON.stringify({
          valorTitular: valorTitularEdit.replace(",", "."),
          valorDependente: valorDependenteEdit.replace(",", "."),
        }),
      });
      setSalvo(true);
      await carregar();
      setTimeout(() => { setPlanoEditando(null); setSalvo(false); }, 900);
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!planoSuspendendo) return;
    setSuspendendo(true);
    try {
      await apiFetch(`/admin/planos/${planoSuspendendo.id}`, {
        method: "PUT",
        body: JSON.stringify({ ativo: !planoSuspendendo.ativo }),
      });
      await carregar();
      setPlanoSuspendendo(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSuspendendo(false);
    }
  };

  const handleExcluirTabela = async () => {
    if (!tabelaExcluindo) return;
    setExcluindo(true);
    try {
      await apiFetch(`/admin/tabelas-preco/${tabelaExcluindo.id}`, { method: "DELETE" });
      toast({ title: "Tabela excluída com sucesso" });
      await carregar();
      setTabelaExcluindo(null);
    } catch (err) {
      toast({ variant: "destructive", title: String(err) });
    } finally {
      setExcluindo(false);
    }
  };

  const abrirVincular = async (tabela: TabelaPreco) => {
    setVincularTabela(tabela);
    setVendedoresSelecionados(tabela.vendedores?.map(v => v.id) ?? []);
    try {
      const data = await apiFetch<{ vendedores: { id: string; nome: string }[] }>(
        "/admin/vendedores-para-tabela"
      );
      setVendedoresDisponiveis(data.vendedores);
    } catch {
      setVendedoresDisponiveis([]);
    }
  };

  const handleVincular = async () => {
    if (!vincularTabela) return;
    setVinculando(true);
    try {
      await apiFetch(`/admin/tabelas-preco/${vincularTabela.id}/vendedores`, {
        method: "PUT",
        body: JSON.stringify({ vendedorIds: vendedoresSelecionados }),
      });
      toast({ title: "Vendedores da tabela atualizados" });
      setVincularTabela(null);
      await carregar();
    } catch (err) {
      toast({ variant: "destructive", title: String(err) });
    } finally {
      setVinculando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Planos</h2>
          <p className="text-muted-foreground">Cadastre tabelas de preço e associe diretamente a um vendedor usando o ícone <strong>⛓</strong> em cada card.</p>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Planos por categoria */}
      {CATEGORIAS.map(cat => {
        const planosCateg = planos.filter(p => p.categoria === cat);
        if (!planosCateg.length) return null;
        const ativos = planosCateg.filter(p => p.ativo).length;
        const suspensos = planosCateg.filter(p => !p.ativo).length;

        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground">{cat}</h3>
              <Badge variant="outline" className={categoriaCor[cat] ?? ""}>
                {ativos} ativo{ativos !== 1 ? "s" : ""}
              </Badge>
              {suspensos > 0 && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                  {suspensos} suspenso{suspensos !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Acomodação</TableHead>
                    <TableHead className="text-right">Vr. Titular</TableHead>
                    <TableHead className="text-right">Vr. Depend.</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planosCateg.map(plano => (
                    <TableRow
                      key={plano.id}
                      className={!plano.ativo ? "opacity-60 bg-muted/20" : "hover:bg-muted/20"}
                      data-testid={`row-plano-${plano.codigo}`}
                    >
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs bg-muted/50">
                          {plano.codigo ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`font-medium text-sm max-w-[220px] ${!plano.ativo ? "line-through text-muted-foreground" : ""}`}>
                        {plano.nome}
                      </TableCell>
                      <TableCell className="text-sm">{plano.acomodacao ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-sm text-primary">
                        {plano.valorTitular ? formatMoney(parseFloat(plano.valorTitular)) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {plano.valorDependente ? formatMoney(parseFloat(plano.valorDependente)) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {plano.ativo ? (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-xs">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs">Suspenso</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                            onClick={() => handleAbrirEdicao(plano)}
                            title="Editar preços"
                            data-testid={`btn-editar-plano-${plano.codigo}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className={`h-8 w-8 p-0 ${plano.ativo ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                            onClick={() => setPlanoSuspendendo(plano)}
                            title={plano.ativo ? "Suspender" : "Reativar"}
                            data-testid={`btn-status-plano-${plano.codigo}`}
                          >
                            {plano.ativo ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );
      })}

      {/* Tabelas de preço por faixa etária */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Tabelas de Preço por Faixa Etária</h3>
            <p className="text-sm text-muted-foreground">Cada tabela pode ser associada a um vendedor e contém os valores dos planos por faixa.</p>
          </div>
          <Button
            size="sm" className="gap-2"
            onClick={() => { setTabelaEditando(undefined); setTabelaModalOpen(true); }}
            data-testid="btn-nova-tabela"
          >
            <Plus className="h-4 w-4" /> Nova Tabela
          </Button>
        </div>

        {tabelas.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              Nenhuma tabela de preço cadastrada. Clique em "Nova Tabela" para criar uma.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {tabelas.map(tabela => (
              <Card key={tabela.id} className="overflow-hidden">
                <CardHeader className="bg-primary/5 pb-3 border-b">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">
                      <span className="font-bold">{tabela.nome}</span>
                      <span className="text-muted-foreground font-normal"> — {tabela.vendedores?.length ? tabela.vendedores.map(v => v.nome).join(", ") : "Sem vendedores"}</span>
                      {tabela.ano && <span className="ml-1 text-xs text-muted-foreground">({tabela.ano})</span>}
                    </CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                        title="Definir vendedores da tabela"
                        onClick={() => void abrirVincular(tabela)}
                        data-testid={`btn-vincular-tabela-${tabela.id}`}
                      >
                        {tabela.vendedores?.length ? <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                        title="Editar tabela"
                        onClick={() => { setTabelaEditando(tabela); setTabelaModalOpen(true); }}
                        data-testid={`btn-editar-tabela-${tabela.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        title="Excluir tabela"
                        onClick={() => setTabelaExcluindo(tabela)}
                        data-testid={`btn-excluir-tabela-${tabela.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Faixa Etária</TableHead>
                      <TableHead className="text-xs">Plano</TableHead>
                      <TableHead className="text-right text-xs">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabela.faixas.map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">{f.faixaEtaria}</TableCell>
                        <TableCell className="text-sm">
                          {(() => { const pl = planos.find(p => p.id === f.planoId); return pl ? <><span className="font-mono mr-1">{pl.codigo}</span>{pl.nome}</> : "—"; })()}
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatMoney(parseFloat(f.valor))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal Editar Valores do Plano */}
      <Dialog open={!!planoEditando} onOpenChange={() => { setPlanoEditando(null); setSalvo(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Editar Preços do Plano
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono font-bold">{planoEditando?.codigo}</span> — {planoEditando?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor Titular (R$)</Label>
                <Input
                  value={valorTitularEdit}
                  onChange={e => setValorTitularEdit(e.target.value)}
                  className="font-mono"
                  placeholder="0,00"
                  data-testid="input-valor-titular"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Dependente (R$)</Label>
                <Input
                  value={valorDependenteEdit}
                  onChange={e => setValorDependenteEdit(e.target.value)}
                  className="font-mono"
                  placeholder="0,00"
                  data-testid="input-valor-dependente"
                />
              </div>
            </div>
            {planoEditando?.coberturas && (
              <div className="space-y-1.5">
                <Label>Coberturas</Label>
                <div className="flex flex-wrap gap-1.5">
                  {planoEditando.coberturas.split(",").map(c => (
                    <Badge key={c} variant="secondary" className="text-xs">{c.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}
            {salvo && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                <Check className="h-4 w-4" /> <span className="text-sm font-medium">Valores salvos com sucesso!</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlanoEditando(null)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao} disabled={salvando || salvo} data-testid="btn-confirmar-edicao-plano">
              {salvando ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Suspender/Reativar Plano */}
      <Dialog open={!!planoSuspendendo} onOpenChange={() => setPlanoSuspendendo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {planoSuspendendo?.ativo
                ? <><PauseCircle className="h-5 w-5 text-amber-600" /> Suspender Plano</>
                : <><PlayCircle className="h-5 w-5 text-emerald-600" /> Reativar Plano</>
              }
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm">
                {planoSuspendendo?.ativo
                  ? <>Ao <strong>suspender</strong> o plano <strong className="font-mono">{planoSuspendendo?.codigo}</strong>, ele ficará indisponível para novas contratações.</>
                  : <>Ao <strong>reativar</strong>, o plano <strong className="font-mono">{planoSuspendendo?.codigo}</strong> voltará a estar disponível.</>
                }
              </p>
            </div>
            <p className="text-sm text-muted-foreground"><strong>{planoSuspendendo?.nome}</strong></p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlanoSuspendendo(null)}>Cancelar</Button>
            <Button
              disabled={suspendendo}
              variant={planoSuspendendo?.ativo ? "destructive" : "default"}
              className={!planoSuspendendo?.ativo ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              onClick={handleToggleStatus}
              data-testid="btn-confirmar-suspensao-plano"
            >
              {suspendendo ? <Loader2 className="h-4 w-4 animate-spin" /> : planoSuspendendo?.ativo ? "Confirmar Suspensão" : "Confirmar Reativação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Criar/Editar Tabela de Preço */}
      {tabelaModalOpen && (
        <TabelaModal
          open={tabelaModalOpen}
          onClose={() => { setTabelaModalOpen(false); setTabelaEditando(undefined); }}
          tabela={tabelaEditando}
          planos={planos}
          onSaved={carregar}
        />
      )}

      {/* Modal Vincular Vendedor à Tabela */}
      <Dialog open={!!vincularTabela} onOpenChange={o => !o && setVincularTabela(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" /> Vincular Vendedor
            </DialogTitle>
            <DialogDescription>
              Tabela: <strong>{vincularTabela?.nome}</strong>
              {vincularTabela?.ano ? ` (${vincularTabela.ano})` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Vendedores que usam esta tabela</Label>
            <div className="rounded-md border max-h-60 overflow-y-auto divide-y" data-testid="select-vendedor-tabela">
              {vendedoresDisponiveis.map(v => (
                <label key={v.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={vendedoresSelecionados.includes(v.id)}
                    onChange={() => setVendedoresSelecionados(p => p.includes(v.id) ? p.filter(x => x !== v.id) : [...p, v.id])}
                  />
                  {v.nome}
                </label>
              ))}
            </div>
            {vendedoresSelecionados.length > 0 && (
              <button
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:underline"
                onClick={() => setVendedoresSelecionados([])}
              >
                <UserX className="h-3.5 w-3.5" /> Remover todos os vínculos
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setVincularTabela(null)}>Cancelar</Button>
            <Button onClick={() => void handleVincular()} disabled={vinculando} data-testid="btn-confirmar-vincular">
              {vinculando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Tabela */}
      <AlertDialog open={!!tabelaExcluindo} onOpenChange={() => setTabelaExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tabela de preço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tabela <strong>{tabelaExcluindo?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void handleExcluirTabela()}
              disabled={excluindo}
            >
              {excluindo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
