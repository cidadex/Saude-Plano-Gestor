import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePropostas, type PropostaAPI } from "@/hooks/useVendedorData";
import { formatMoney } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { Search, SlidersHorizontal, Plus, Check, Loader2, Sparkles, X, ChevronDown, UserPlus, Trash2, AlertCircle, User } from "lucide-react";

type PlanoAPI = { id: string; codigo: string | null; nome: string; categoria: string | null; valorTitular: string | null; valorDependente: string | null; ativo: boolean };
type TabelaFaixa = { id: string; tabelaId: string; planoId: string; faixaEtaria: string; valor: string; valorApartamento?: string | null };
type TabelaVendedor = { id: string; nome: string; tipoPlano?: string | null; faixas: TabelaFaixa[] };

type DepVendedor = {
  _id: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  grauParentesco: string;
  nomeMae: string;
  estadoCivil: string;
  sexo: string;
  planoId: string;
  codigoPlano: string;
  planoNome: string;
  faixaId: string;
  valor: number;
};

const GRAUS = ["CÔNJUGE", "FILHO(A)", "PAI/MÃE", "OUTRO", "AGREGADO"];
const STATUS_LABEL: Record<string, string> = { AGUARDANDO_ENVIO: "Aguardando envio", ENVIADA_OPERADORA: "Enviada à operadora", ACEITA: "Aceita", RECUSADA: "Recusada", ATIVA: "Ativo" };
const STATUS_COLORS: Record<string, string> = { ATIVA: "border-emerald-300 bg-emerald-50 text-emerald-700", AGUARDANDO_ENVIO: "border-amber-300 bg-amber-50 text-amber-700", ENVIADA_OPERADORA: "border-blue-300 bg-blue-50 text-blue-700", ACEITA: "border-teal-300 bg-teal-50 text-teal-700", RECUSADA: "border-red-300 bg-red-50 text-red-700" };
const formasPagamento = ["BOLETO", "PIX", "CARTAO"];
const UFS_BR = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function getNome(p: PropostaAPI) { return String((p.dadosTitular as Record<string, unknown>).nome ?? "—"); }
function getCpf(p: PropostaAPI) { return String((p.dadosTitular as Record<string, unknown>).cpf ?? "—"); }
function getPlanoNome(p: PropostaAPI) { return String((p.dadosTitular as Record<string, unknown>).plano ?? "—"); }
function getCodigoPlano(p: PropostaAPI) { return String((p.dadosTitular as Record<string, unknown>).codigoPlano ?? "—"); }

const DEP_INIT: Omit<DepVendedor, "_id"> = { nome: "", cpf: "", dataNascimento: "", grauParentesco: "FILHO(A)", nomeMae: "", estadoCivil: "", sexo: "", planoId: "", codigoPlano: "", planoNome: "", faixaId: "", valor: 0 };

const FORM_INIT = {
  clienteNome: "", clienteCpf: "", dataNascimento: "", sexo: "", telefone: "",
  email: "", cep: "", numero: "", logradouro: "", bairro: "", cidade: "", estado: "",
  estadoCivil: "", nomeMae: "", rg: "", rgOrgaoEmissor: "", rgUf: "CE",
  planoId: "", tabelaId: "", codigoPlano: "", planoNome: "",
  faixaIdTitular: "", valorTitular: 0,
  contratoId: "", responsavelFinanceiroId: "", titularEhResponsavel: false,
  formaPagamento: "", diaVencimento: "", observacao: "",
  dependentes: [] as DepVendedor[],
};

export default function VendedorPropostas() {
  const { propostas, loading, reload } = usePropostas();
  const [planosAPI, setPlanosAPI] = useState<PlanoAPI[]>([]);
  const [tabelas, setTabelas] = useState<TabelaVendedor[]>([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);
  const [contratosList, setContratosList] = useState<Array<{ id: string; nome: string; asaasModo?: string }>>([]);
  const [responsaveisList, setResponsaveisList] = useState<Array<{ id: string; nome: string; tipo: string }>>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [novaPropostaAberta, setNovaPropostaAberta] = useState(false);
  const [editandoProposta, setEditandoProposta] = useState<PropostaAPI | null>(null);
  const [editForm2, setEditForm2] = useState({ nome: "", cpf: "", telefone: "", planoNome: "", codigoPlano: "", formaPagamento: "", observacao: "", valorTotal: "", nomeMae: "", rg: "", rgOrgaoEmissor: "", rgUf: "CE", estadoCivil: "", diaVencimento: "", valorMensal: "" });
  const [editSalvando, setEditSalvando] = useState(false);
  const [editErro, setEditErro] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [salvarErro, setSalvarErro] = useState("");

  useEffect(() => {
    Promise.all([
      (apiFetch("/planos") as Promise<{ planos: PlanoAPI[] }>).then(d => setPlanosAPI((d.planos ?? []).filter(p => p.ativo))),
      (apiFetch("/vendedor/tabela-preco") as Promise<{ tabelas: TabelaVendedor[] }>).then(d => setTabelas(d.tabelas ?? [])),
    ]).catch(console.error).finally(() => setLoadingPlanos(false));
    (apiFetch("/contratos") as Promise<{ contratos: Array<{ id: string; nome: string; asaasModo?: string }> }>).then(d => setContratosList(d.contratos ?? [])).catch(console.error);
    (apiFetch("/responsaveis-financeiros") as Promise<{ responsaveis: Array<{ id: string; nome: string; tipo: string }> }>).then(d => setResponsaveisList(d.responsaveis ?? [])).catch(console.error);
  }, []);

  const [iaAberta, setIaAberta] = useState(false);
  const [iaTexto, setIaTexto] = useState("");
  const [iaAnalisando, setIaAnalisando] = useState(false);
  const [iaErro, setIaErro] = useState("");
  const [iaPreenchido, setIaPreenchido] = useState(false);

  const [form, setForm] = useState({ ...FORM_INIT });

  const statuses = useMemo(() => Array.from(new Set(propostas.map(p => p.status))), [propostas]);
  const filteredPropostas = useMemo(() => {
    return propostas.filter(p => {
      const nome = getNome(p).toLowerCase();
      const cpf = getCpf(p);
      const matchSearch = nome.includes(search.toLowerCase()) || cpf.includes(search);
      const matchStatus = statusFilter === "TODOS" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter, propostas]);

  const tabelaAtual = tabelas.find(t => t.id === form.tabelaId) ?? tabelas[0];

  const planosNaTabela = useMemo(() => {
    if (!tabelaAtual || tabelaAtual.faixas.length === 0) return planosAPI;
    const ids = [...new Set(tabelaAtual.faixas.map(f => f.planoId))];
    const filtrados = planosAPI.filter(p => ids.includes(p.id));
    return filtrados.length > 0 ? filtrados : planosAPI;
  }, [tabelaAtual, planosAPI]);

  const faixasTitular = useMemo(() => {
    if (!tabelaAtual || !form.planoId) return [];
    return tabelaAtual.faixas.filter(f => f.planoId === form.planoId);
  }, [tabelaAtual, form.planoId]);

  const getFaixasDep = (depPlanoId: string) => {
    if (!tabelaAtual || !depPlanoId) return [];
    return tabelaAtual.faixas.filter(f => f.planoId === depPlanoId);
  };

  const totalGeral = useMemo(() => {
    return form.valorTitular + form.dependentes.reduce((s, d) => s + d.valor, 0);
  }, [form.valorTitular, form.dependentes]);

  const handleSelecionarPlano = (plano: PlanoAPI) => {
    setForm(f => ({ ...f, planoId: plano.id, codigoPlano: plano.codigo ?? "", planoNome: plano.nome, faixaIdTitular: "", valorTitular: 0 }));
  };

  const handleSelecionarFaixaTitular = (faixaId: string) => {
    const faixa = faixasTitular.find(f => f.id === faixaId);
    setForm(f => ({ ...f, faixaIdTitular: faixaId, valorTitular: faixa ? parseFloat(faixa.valor) : 0 }));
  };

  const handleAnalisarIA = async () => {
    if (!iaTexto.trim()) return;
    setIaAnalisando(true); setIaErro(""); setIaPreenchido(false);
    try {
      const res = await apiFetch("/ai/parse-cliente", { method: "POST", body: JSON.stringify({ texto: iaTexto }) }) as { dados: Record<string, string | null> };
      const dados = res.dados ?? {};
      setForm(prev => {
        const valorIA = dados.valorMensal != null ? parseFloat(String(dados.valorMensal).replace(",", ".")) : NaN;
        return {
          ...prev,
          clienteNome: dados.nome ?? prev.clienteNome,
          clienteCpf: dados.cpf ?? prev.clienteCpf,
          dataNascimento: dados.dataNascimento ?? prev.dataNascimento,
          sexo: dados.sexo ?? prev.sexo,
          telefone: dados.telefone ?? prev.telefone,
          nomeMae: dados.nomeMae ?? prev.nomeMae,
          rg: dados.rg ?? prev.rg,
          rgOrgaoEmissor: dados.rgOrgaoEmissor ?? prev.rgOrgaoEmissor,
          rgUf: dados.rgUf ?? prev.rgUf,
          estadoCivil: dados.estadoCivil ?? prev.estadoCivil,
          email: dados.email ?? prev.email,
          cep: dados.cep ?? prev.cep,
          valorTitular: !prev.faixaIdTitular && Number.isFinite(valorIA) && valorIA > 0 ? valorIA : prev.valorTitular,
        };
      });
      setIaPreenchido(true);
      setTimeout(() => setIaAberta(false), 1200);
    } catch (err: unknown) {
      setIaErro(err instanceof Error ? err.message : "Não foi possível analisar o texto.");
    } finally {
      setIaAnalisando(false);
    }
  };

  const addDep = () => setForm(f => ({
    ...f, dependentes: [...f.dependentes, { _id: `d${Date.now()}`, ...DEP_INIT }],
  }));
  const removeDep = (id: string) => setForm(f => ({ ...f, dependentes: f.dependentes.filter(d => d._id !== id) }));
  const updateDep = (id: string, field: string, val: string | number) => setForm(f => ({
    ...f, dependentes: f.dependentes.map(d => {
      if (d._id !== id) return d;
      if (field === "planoId") {
        const planoSel = planosNaTabela.find(p => p.id === val);
        return { ...d, planoId: val as string, codigoPlano: planoSel?.codigo ?? "", planoNome: planoSel?.nome ?? "", faixaId: "", valor: 0 };
      }
      if (field === "faixaId") {
        const faixas = tabelaAtual?.faixas.filter(fx => fx.planoId === d.planoId) ?? [];
        const faixa = faixas.find(fx => fx.id === val);
        return { ...d, faixaId: val as string, valor: faixa ? parseFloat(faixa.valor) : 0 };
      }
      return { ...d, [field]: val };
    }),
  }));

  const handleSalvar = async () => {
    setSalvarErro("");
    if (form.planoId && faixasTitular.length > 0 && !form.faixaIdTitular) {
      setSalvarErro("Selecione a faixa etária do titular antes de salvar.");
      return;
    }
    if (!form.contratoId) { setSalvarErro("Selecione o contrato."); return; }
    if (!form.titularEhResponsavel && !form.responsavelFinanceiroId) {
      setSalvarErro("Selecione o responsável financeiro ou marque o titular como responsável.");
      return;
    }
    setSalvando(true);
    try {
      await apiFetch("/vendedor/propostas", {
        method: "POST",
        body: JSON.stringify({
          contratoId: form.contratoId,
          responsavelFinanceiroId: form.titularEhResponsavel ? undefined : form.responsavelFinanceiroId,
          titularEhResponsavel: form.titularEhResponsavel,
          dadosTitular: {
            nome: form.clienteNome.toUpperCase(),
            cpf: form.clienteCpf,
            dataNascimento: form.dataNascimento,
            sexo: form.sexo,
            telefone: form.telefone,
            email: form.email,
            cep: form.cep,
            numero: form.numero,
            logradouro: form.logradouro,
            bairro: form.bairro,
            cidade: form.cidade,
            estado: form.estado,
            nomeMae: form.nomeMae,
            rg: form.rg,
            rgOrgaoEmissor: form.rgOrgaoEmissor,
            rgUf: form.rgUf,
            estadoCivil: form.estadoCivil,
            tipo: "TITULAR",
            plano: form.planoNome,
            codigoPlano: form.codigoPlano,
            formaPagamento: form.formaPagamento,
            diaVencimento: form.diaVencimento ? Number(form.diaVencimento) : null,
            valorMensal: form.valorTitular > 0 ? form.valorTitular.toFixed(2) : null,
            observacao: form.observacao,
            faixaEtaria: faixasTitular.find(f => f.id === form.faixaIdTitular)?.faixaEtaria ?? "",
            valor: form.valorTitular,
            titularEhResponsavel: form.titularEhResponsavel,
          },
          dadosDependentes: form.dependentes.map(d => {
            const faixas = tabelaAtual?.faixas.filter(fx => fx.planoId === d.planoId) ?? [];
            return {
              nome: d.nome.toUpperCase(), cpf: d.cpf, dataNascimento: d.dataNascimento,
              grauParentesco: d.grauParentesco, nomeMae: d.nomeMae, estadoCivil: d.estadoCivil, sexo: d.sexo,
              tipo: "DEPENDENTE", plano: d.planoNome, codigoPlano: d.codigoPlano, planoId: d.planoId,
              faixaEtaria: faixas.find(f => f.id === d.faixaId)?.faixaEtaria ?? "",
              valor: d.valor,
            };
          }),
          valorTotal: totalGeral > 0 ? totalGeral.toFixed(2) : null,
        }),
      });
      setSalvo(true);
      await reload();
      setTimeout(() => {
        setSalvo(false); setStep(1); setForm({ ...FORM_INIT });
        setNovaPropostaAberta(false); setIaTexto(""); setIaAberta(false); setIaPreenchido(false);
      }, 1200);
    } catch (err: unknown) {
      setSalvarErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  };

  const handleFechar = () => {
    setNovaPropostaAberta(false); setStep(1); setSalvo(false); setSalvarErro("");
    setIaTexto(""); setIaAberta(false); setIaPreenchido(false); setForm({ ...FORM_INIT });
  };

  const handleAbrirEdit = (p: PropostaAPI) => {
    const dt = p.dadosTitular as Record<string, unknown>;
    setEditandoProposta(p);
    setEditErro("");
    setEditForm2({
      nome: String(dt.nome ?? ""), cpf: String(dt.cpf ?? ""), telefone: String(dt.telefone ?? ""),
      planoNome: String(dt.plano ?? ""), codigoPlano: String(dt.codigoPlano ?? ""),
      formaPagamento: String(dt.formaPagamento ?? ""), observacao: String(dt.observacao ?? ""),
      valorTotal: p.valorTotal ?? "", nomeMae: String(dt.nomeMae ?? ""), rg: String(dt.rg ?? ""),
      rgOrgaoEmissor: String(dt.rgOrgaoEmissor ?? ""), rgUf: String(dt.rgUf ?? "CE"),
      estadoCivil: String(dt.estadoCivil ?? ""), diaVencimento: dt.diaVencimento != null ? String(dt.diaVencimento) : "",
      valorMensal: String(dt.valorMensal ?? ""),
    });
  };

  const handleSalvarEdit = async () => {
    if (!editandoProposta) return;
    setEditSalvando(true); setEditErro("");
    try {
      await apiFetch(`/vendedor/propostas/${editandoProposta.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          dadosTitular: {
            nome: editForm2.nome, cpf: editForm2.cpf, telefone: editForm2.telefone,
            plano: editForm2.planoNome, codigoPlano: editForm2.codigoPlano,
            formaPagamento: editForm2.formaPagamento, observacao: editForm2.observacao,
            nomeMae: editForm2.nomeMae, rg: editForm2.rg, rgOrgaoEmissor: editForm2.rgOrgaoEmissor,
            rgUf: editForm2.rgUf, estadoCivil: editForm2.estadoCivil,
            diaVencimento: editForm2.diaVencimento ? Number(editForm2.diaVencimento) : null,
            valorMensal: editForm2.valorMensal ? editForm2.valorMensal.replace(",", ".") : null,
          },
          valorTotal: editForm2.valorTotal || undefined,
        }),
      });
      await reload(); setEditandoProposta(null);
    } catch (err: unknown) {
      setEditErro(err instanceof Error ? err.message : String(err));
    } finally {
      setEditSalvando(false);
    }
  };

  const podeSair1 = !!form.clienteNome && !!form.clienteCpf && !!form.planoId && (faixasTitular.length === 0 || !!form.faixaIdTitular);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between pb-4 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Minhas Propostas</h2>
          <p className="text-muted-foreground">Acompanhe o andamento das suas vendas.</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setNovaPropostaAberta(true)} data-testid="btn-nova-proposta">
          <Plus className="h-4 w-4" /> Nova Proposta
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 bg-muted/20">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <SlidersHorizontal className="h-4 w-4" /> Refinar Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Cliente</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Nome ou CPF..." className="pl-9 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Status da Proposta</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  {statuses.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2">
              <TableHead className="font-semibold text-foreground">Cliente / CPF</TableHead>
              <TableHead className="font-semibold text-foreground">Plano</TableHead>
              <TableHead className="font-semibold text-foreground">Contrato / Resp.</TableHead>
              <TableHead className="font-semibold text-foreground">Envio</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Valor</TableHead>
              <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPropostas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground/30" />
                    <p>Nenhuma proposta encontrada com estes filtros.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredPropostas.map(prop => (
              <TableRow key={prop.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleAbrirEdit(prop)} data-testid={`row-proposta-vendedor-${prop.id}`}>
                <TableCell className="font-medium py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-foreground">{getNome(prop)}</span>
                    <span className="text-xs text-muted-foreground font-mono">{getCpf(prop)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm">{getPlanoNome(prop)}</span>
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded w-fit">{getCodigoPlano(prop)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {prop.contratoNome ? (
                      <span className="text-xs px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-700 w-fit">{prop.contratoNome}</span>
                    ) : <span className="text-xs text-muted-foreground">— sem contrato</span>}
                    {prop.responsavelNome ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded border w-fit ${prop.responsavelTipo === "PJ" ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-teal-300 bg-teal-50 text-teal-700"}`}>
                        {prop.responsavelNome} <span className="opacity-60">({prop.responsavelTipo})</span>
                      </span>
                    ) : <span className="text-xs text-muted-foreground">— sem resp.</span>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {prop.createdAt ? new Date(prop.createdAt).toLocaleDateString("pt-BR") : "—"}
                </TableCell>
                <TableCell className="font-bold text-right text-foreground">
                  {formatMoney(parseFloat(prop.valorTotal ?? "0"))}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`font-medium border whitespace-nowrap ${STATUS_COLORS[prop.status] ?? ""}`}>
                    {STATUS_LABEL[prop.status] ?? prop.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal Nova Proposta */}
      <Dialog open={novaPropostaAberta} onOpenChange={handleFechar}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Nova Proposta
            </DialogTitle>
            <DialogDescription>Preencha os dados do cliente, plano e dependentes para registrar a proposta.</DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-2 py-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step >= s ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"}`}>
                  {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Cliente & Plano" : s === 2 ? "Dependentes" : "Financeiro"}
                </span>
                {s < 3 && <div className="h-px w-8 bg-muted-foreground/30" />}
              </div>
            ))}
          </div>

          {/* ─── STEP 1 — Cliente + Plano do Titular ─── */}
          {step === 1 && (
            <div className="space-y-4 py-2">
              {/* Painel IA */}
              <div className="rounded-lg border border-violet-200 bg-violet-50/60">
                <button type="button" onClick={() => { setIaAberta(p => !p); setIaErro(""); }}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-violet-800 hover:bg-violet-100/60 rounded-lg transition-colors"
                  data-testid="btn-colar-dados-ia">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    Colar dados com IA
                    <span className="text-xs font-normal text-violet-600">— cole texto e a IA preenche o formulário</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-violet-500 transition-transform ${iaAberta ? "rotate-180" : ""}`} />
                </button>
                {iaAberta && (
                  <div className="px-4 pb-4 space-y-3">
                    <Textarea placeholder="Cole aqui qualquer texto com dados do cliente: mensagem de WhatsApp, e-mail, planilha colada, etc."
                      value={iaTexto} onChange={e => { setIaTexto(e.target.value); setIaPreenchido(false); setIaErro(""); }}
                      className="resize-none bg-white text-sm min-h-[100px]" rows={4} data-testid="textarea-ia-dados" />
                    {iaErro && <p className="text-xs text-red-600 flex items-center gap-1"><X className="h-3 w-3" />{iaErro}</p>}
                    {iaPreenchido && <p className="text-xs text-emerald-700 flex items-center gap-1"><Check className="h-3 w-3" /> Dados preenchidos! Confira abaixo.</p>}
                    <Button size="sm" onClick={handleAnalisarIA} disabled={iaAnalisando || !iaTexto.trim()}
                      className="gap-2 bg-violet-600 hover:bg-violet-700" data-testid="btn-analisar-ia">
                      {iaAnalisando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analisando...</> : <><Sparkles className="h-3.5 w-3.5" />Analisar</>}
                    </Button>
                  </div>
                )}
              </div>

              {/* Dados pessoais */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do Titular</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome Completo *</Label>
                  <Input placeholder="NOME COMPLETO" value={form.clienteNome}
                    onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))} data-testid="input-proposta-nome" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CPF *</Label>
                  <Input placeholder="000.000.000-00" value={form.clienteCpf}
                    onChange={e => setForm(f => ({ ...f, clienteCpf: e.target.value }))} data-testid="input-proposta-cpf" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data de Nascimento</Label>
                  <Input type="date" value={form.dataNascimento} onChange={e => setForm(f => ({ ...f, dataNascimento: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sexo</Label>
                  <Select value={form.sexo} onValueChange={v => setForm(f => ({ ...f, sexo: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Estado Civil</Label>
                  <Select value={form.estadoCivil} onValueChange={v => setForm(f => ({ ...f, estadoCivil: v }))}>
                    <SelectTrigger data-testid="select-proposta-estado-civil"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                      <SelectItem value="CASADO">Casado(a)</SelectItem>
                      <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                      <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                      <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Telefone / WhatsApp</Label>
                  <Input placeholder="(85) 99999-9999" value={form.telefone}
                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} data-testid="input-proposta-telefone" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">E-mail</Label>
                  <Input placeholder="email@exemplo.com" type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome da Mãe</Label>
                  <Input placeholder="Nome completo da mãe" value={form.nomeMae}
                    onChange={e => setForm(f => ({ ...f, nomeMae: e.target.value }))} data-testid="input-proposta-nome-mae" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">RG</Label>
                  <Input value={form.rg} onChange={e => setForm(f => ({ ...f, rg: e.target.value }))} data-testid="input-proposta-rg" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Órgão Emissor</Label>
                  <Input placeholder="SSP" value={form.rgOrgaoEmissor}
                    onChange={e => setForm(f => ({ ...f, rgOrgaoEmissor: e.target.value }))} data-testid="input-proposta-rg-orgao" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">UF do RG</Label>
                  <Select value={form.rgUf} onValueChange={v => setForm(f => ({ ...f, rgUf: v }))}>
                    <SelectTrigger data-testid="select-proposta-rg-uf"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {UFS_BR.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CEP</Label>
                  <Input placeholder="00000-000" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Logradouro</Label>
                  <Input placeholder="Rua, Avenida..." value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Número</Label>
                  <Input placeholder="123" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bairro</Label>
                  <Input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cidade</Label>
                  <Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                    <SelectTrigger><SelectValue placeholder="UF..." /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {UFS_BR.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seleção de Plano */}
              <div className="pt-2 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano do Titular *</p>
                {tabelas.length > 1 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tabela de Preços</Label>
                    <Select value={form.tabelaId || (tabelaAtual?.id ?? "")} onValueChange={v => setForm(f => ({ ...f, tabelaId: v, planoId: "", codigoPlano: "", planoNome: "", faixaIdTitular: "", valorTitular: 0 }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione a tabela..." /></SelectTrigger>
                      <SelectContent>{tabelas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {loadingPlanos ? (
                    <div className="col-span-2 flex items-center justify-center h-16 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando planos...
                    </div>
                  ) : planosNaTabela.length === 0 ? (
                    <div className="col-span-2 text-center py-4 text-sm text-muted-foreground">Nenhum plano disponível.</div>
                  ) : planosNaTabela.map(p => (
                    <button key={p.id} onClick={() => handleSelecionarPlano(p)} data-testid={`btn-proposta-plano-${p.codigo}`}
                      className={`p-3 rounded-lg border text-left transition-all ${form.planoId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
                      <div className="font-mono font-bold text-sm">{p.codigo ?? "—"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">{p.nome}</div>
                    </button>
                  ))}
                </div>

                {form.planoId && faixasTitular.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Faixa Etária do Titular *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {faixasTitular.map(f => (
                        <button key={f.id} onClick={() => handleSelecionarFaixaTitular(f.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${form.faixaIdTitular === f.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
                          <div className="text-xs font-semibold">{f.faixaEtaria}</div>
                          <div className="text-xs font-bold text-primary mt-0.5">R$ {parseFloat(f.valor).toFixed(2).replace(".", ",")}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {form.valorTitular > 0 && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Valor do Titular</span>
                    <span className="text-lg font-bold text-primary">R$ {form.valorTitular.toFixed(2).replace(".", ",")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 2 — Dependentes ─── */}
          {step === 2 && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Dependentes</p>
                  <p className="text-xs text-muted-foreground">Cada dependente tem seu próprio plano e faixa etária.</p>
                </div>
                <Button size="sm" variant="outline" onClick={addDep} className="gap-1.5 text-xs" data-testid="btn-add-dep">
                  <UserPlus className="h-3.5 w-3.5" /> Adicionar Dependente
                </Button>
              </div>

              {form.dependentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground border-2 border-dashed rounded-lg">
                  <UserPlus className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Nenhum dependente. Clique em "Adicionar Dependente" para incluir.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.dependentes.map((dep, i) => {
                    const faixasDep = getFaixasDep(dep.planoId);
                    return (
                      <div key={dep._id} className="rounded-lg border p-3 space-y-3 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary">Dependente {i + 1}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                            onClick={() => removeDep(dep._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                            <Input placeholder="Nome completo" value={dep.nome}
                              onChange={e => updateDep(dep._id, "nome", e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">CPF</Label>
                            <Input placeholder="000.000.000-00" value={dep.cpf}
                              onChange={e => updateDep(dep._id, "cpf", e.target.value)} className="h-8 text-sm font-mono" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Nascimento</Label>
                            <Input type="date" value={dep.dataNascimento}
                              onChange={e => updateDep(dep._id, "dataNascimento", e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Parentesco</Label>
                            <Select value={dep.grauParentesco} onValueChange={v => updateDep(dep._id, "grauParentesco", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>{GRAUS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Sexo</Label>
                            <Select value={dep.sexo} onValueChange={v => updateDep(dep._id, "sexo", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="M">Masculino</SelectItem>
                                <SelectItem value="F">Feminino</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Estado Civil</Label>
                            <Select value={dep.estadoCivil} onValueChange={v => updateDep(dep._id, "estadoCivil", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                                <SelectItem value="CASADO">Casado(a)</SelectItem>
                                <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                                <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                                <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">Nome da Mãe</Label>
                            <Input placeholder="Nome completo da mãe" value={dep.nomeMae}
                              onChange={e => updateDep(dep._id, "nomeMae", e.target.value)} className="h-8 text-sm" />
                          </div>
                        </div>

                        {/* Plano do dependente */}
                        <div className="space-y-2 pt-1 border-t">
                          <Label className="text-xs font-semibold text-muted-foreground">Plano do Dependente</Label>
                          <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                            {planosNaTabela.map(p => (
                              <button key={p.id} onClick={() => updateDep(dep._id, "planoId", p.id)}
                                className={`p-2 rounded border text-left transition-all ${dep.planoId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
                                <div className="font-mono font-bold text-xs">{p.codigo ?? "—"}</div>
                                <div className="text-xs text-muted-foreground leading-tight line-clamp-1">{p.nome}</div>
                              </button>
                            ))}
                          </div>
                          {dep.planoId && faixasDep.length > 0 && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Faixa Etária</Label>
                              <Select value={dep.faixaId} onValueChange={v => updateDep(dep._id, "faixaId", v)}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione a faixa..." /></SelectTrigger>
                                <SelectContent>
                                  {faixasDep.map(f => (
                                    <SelectItem key={f.id} value={f.id}>
                                      {f.faixaEtaria} — R$ {parseFloat(f.valor).toFixed(2).replace(".", ",")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {dep.valor > 0 && (
                            <div className="rounded bg-primary/5 border border-primary/20 px-3 py-1.5 flex items-center justify-between">
                              <span className="text-xs font-medium">Valor</span>
                              <span className="text-sm font-bold text-primary">R$ {dep.valor.toFixed(2).replace(".", ",")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 3 — Financeiro ─── */}
          {step === 3 && (
            <div className="space-y-4 py-2">
              {/* Resumo dos planos */}
              <div className="rounded-lg border p-4 space-y-3 bg-muted/10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo dos Planos</p>
                <div className="space-y-2">
                  {/* Titular */}
                  <div className="flex items-center justify-between py-1.5 border-b">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{form.clienteNome || "Titular"}</p>
                        {form.planoNome && <p className="text-xs text-muted-foreground">{form.codigoPlano} — {form.planoNome}</p>}
                        {form.faixaIdTitular && <p className="text-xs text-muted-foreground">{faixasTitular.find(f => f.id === form.faixaIdTitular)?.faixaEtaria}</p>}
                      </div>
                    </div>
                    <span className="font-bold text-primary">{form.valorTitular > 0 ? `R$ ${form.valorTitular.toFixed(2).replace(".", ",")}` : "—"}</span>
                  </div>
                  {/* Dependentes */}
                  {form.dependentes.map((d, i) => (
                    <div key={d._id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{d.nome || `Dependente ${i + 1}`} <Badge variant="outline" className="text-xs ml-1">{d.grauParentesco}</Badge></p>
                        {d.planoNome && <p className="text-xs text-muted-foreground">{d.codigoPlano} — {d.planoNome}</p>}
                        {d.faixaId && <p className="text-xs text-muted-foreground">{getFaixasDep(d.planoId).find(f => f.id === d.faixaId)?.faixaEtaria}</p>}
                      </div>
                      <span className="font-bold text-primary">{d.valor > 0 ? `R$ ${d.valor.toFixed(2).replace(".", ",")}` : "—"}</span>
                    </div>
                  ))}
                </div>
                {/* Total */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Total Mensal</span>
                  <span className="text-xl font-bold text-primary">R$ {totalGeral.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>

              {/* Contrato */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contrato *</Label>
                <Select value={form.contratoId} onValueChange={v => setForm(f => ({ ...f, contratoId: v }))}>
                  <SelectTrigger data-testid="select-vend-contrato"><SelectValue placeholder="Selecione o contrato..." /></SelectTrigger>
                  <SelectContent>
                    {contratosList.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome} {c.asaasModo === "SANDBOX" && "(sandbox)"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsável Financeiro */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
                <p className="text-xs font-semibold text-blue-800">Responsável Financeiro *</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, titularEhResponsavel: true, responsavelFinanceiroId: "" }))}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${form.titularEhResponsavel ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border hover:border-muted-foreground/50"}`}
                  >
                    O próprio titular
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, titularEhResponsavel: false }))}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${!form.titularEhResponsavel ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border hover:border-muted-foreground/50"}`}
                  >
                    Outro responsável
                  </button>
                </div>
                {!form.titularEhResponsavel && (
                  <Select value={form.responsavelFinanceiroId} onValueChange={v => setForm(f => ({ ...f, responsavelFinanceiroId: v }))}>
                    <SelectTrigger data-testid="select-vend-responsavel"><SelectValue placeholder="Selecione o responsável..." /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {responsaveisList.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nome} <span className="text-xs text-muted-foreground">({r.tipo})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Pagamento */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                  <Select value={form.formaPagamento} onValueChange={v => setForm(f => ({ ...f, formaPagamento: v }))}>
                    <SelectTrigger data-testid="select-proposta-pagamento"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{formasPagamento.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Dia de Vencimento (1–31)</Label>
                  <Input type="number" min={1} max={31} placeholder="10" value={form.diaVencimento}
                    onChange={e => setForm(f => ({ ...f, diaVencimento: e.target.value }))}
                    data-testid="input-proposta-dia-vencimento" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <Textarea placeholder="Informações adicionais..." value={form.observacao}
                    onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                    className="resize-none" rows={2} data-testid="textarea-proposta-obs" />
                </div>
              </div>

              {salvo && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
                  <Check className="h-5 w-5" /><span className="font-medium">Proposta cadastrada com sucesso!</span>
                </div>
              )}
              {salvarErro && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{salvarErro}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <div>{step > 1 && !salvo && <Button variant="outline" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}>Voltar</Button>}</div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleFechar}>Cancelar</Button>
              {step < 3 ? (
                <Button
                  onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
                  disabled={step === 1 && !podeSair1}
                  data-testid="btn-proximo-proposta"
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  className="bg-primary"
                  onClick={handleSalvar}
                  disabled={salvando || salvo || !form.clienteNome || !form.clienteCpf || !form.planoId || !form.contratoId || (!form.titularEhResponsavel && !form.responsavelFinanceiroId)}
                  data-testid="btn-salvar-proposta"
                >
                  {salvando ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Salvando...</> : salvo ? <><Check className="h-4 w-4 mr-1" /> Salvo!</> : "Cadastrar Proposta"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Proposta */}
      {editandoProposta && (
        <Dialog open={!!editandoProposta} onOpenChange={() => setEditandoProposta(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Proposta</DialogTitle>
              <DialogDescription>Edite os dados da proposta (apenas AGUARDANDO_ENVIO).</DialogDescription>
            </DialogHeader>
            {editandoProposta.status !== "AGUARDANDO_ENVIO" && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" /> Esta proposta não pode ser editada no status atual.
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <Input value={editForm2.nome} onChange={e => setEditForm2(f => ({ ...f, nome: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CPF</Label>
                <Input value={editForm2.cpf} onChange={e => setEditForm2(f => ({ ...f, cpf: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <Input value={editForm2.telefone} onChange={e => setEditForm2(f => ({ ...f, telefone: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Estado Civil</Label>
                <Select value={editForm2.estadoCivil} onValueChange={v => setEditForm2(f => ({ ...f, estadoCivil: v }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                    <SelectItem value="CASADO">Casado(a)</SelectItem>
                    <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                    <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                    <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome da Mãe</Label>
                <Input value={editForm2.nomeMae} onChange={e => setEditForm2(f => ({ ...f, nomeMae: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">RG</Label>
                <Input value={editForm2.rg} onChange={e => setEditForm2(f => ({ ...f, rg: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Órgão Emissor</Label>
                <Input value={editForm2.rgOrgaoEmissor} onChange={e => setEditForm2(f => ({ ...f, rgOrgaoEmissor: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Código do Plano</Label>
                <Input value={editForm2.codigoPlano} onChange={e => setEditForm2(f => ({ ...f, codigoPlano: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Plano</Label>
                <Input value={editForm2.planoNome} onChange={e => setEditForm2(f => ({ ...f, planoNome: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                <Select value={editForm2.formaPagamento} onValueChange={v => setEditForm2(f => ({ ...f, formaPagamento: v }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{formasPagamento.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Dia de Vencimento</Label>
                <Input type="number" min={1} max={31} value={editForm2.diaVencimento} onChange={e => setEditForm2(f => ({ ...f, diaVencimento: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valor Mensal (R$)</Label>
                <Input value={editForm2.valorMensal} onChange={e => setEditForm2(f => ({ ...f, valorMensal: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valor Total (R$)</Label>
                <Input value={editForm2.valorTotal} onChange={e => setEditForm2(f => ({ ...f, valorTotal: e.target.value }))} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <Textarea value={editForm2.observacao} onChange={e => setEditForm2(f => ({ ...f, observacao: e.target.value }))} className="resize-none" rows={2} disabled={editandoProposta.status !== "AGUARDANDO_ENVIO"} />
              </div>
            </div>
            {editErro && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{editErro}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditandoProposta(null)}>Fechar</Button>
              {editandoProposta.status === "AGUARDANDO_ENVIO" && (
                <Button onClick={handleSalvarEdit} disabled={editSalvando}>
                  {editSalvando ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Salvando...</> : "Salvar"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
