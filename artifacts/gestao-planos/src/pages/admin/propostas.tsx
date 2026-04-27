import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { planos } from "@/data/planos";
import { Textarea } from "@/components/ui/textarea";
import { Search, SlidersHorizontal, Loader2, RefreshCw, AlertCircle, Receipt, Plus, Sparkles, ChevronDown, Check, X, UserPlus, Trash2 } from "lucide-react";

type VendedorSelect = { id: string; nome: string; email: string };
type PlanoSelect = { id: string; codigo: string | null; nome: string; valorTitular: string | null; ativo: boolean };
type ContratoSelect = { id: string; nome: string; ativo: boolean; asaasModo: "SANDBOX" | "PRODUCAO" };
type ResponsavelSelect = { id: string; nome: string; tipo: "PF" | "PJ"; cpfCnpj: string };
type DepAdmin = { _id: string; nome: string; cpf: string; dataNascimento: string; grauParentesco: string };

const GRAUS_PARENTESCO = ["CÔNJUGE", "FILHO(A)", "PAI/MÃE", "OUTRO", "AGREGADO"];
const FORMAS_PAGAMENTO = ["BOLETO", "CORA", "C6", "BTG", "PIX", "DÉBITO EM FOLHA"];

const UFS_BR = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const NOVA_FORM_INIT = {
  vendedorId: "", contratoId: "", responsavelFinanceiroId: "",
  clienteNome: "", clienteCpf: "", dataNascimento: "", sexo: "",
  telefone: "", email: "", cep: "", logradouro: "", numero: "", bairro: "",
  cidade: "", estado: "", planoId: "", formaPagamento: "", valorManual: "",
  observacao: "", dependentes: [] as DepAdmin[],
  nomeMae: "", rg: "", rgOrgaoEmissor: "", rgUf: "CE", estadoCivil: "",
  diaVencimento: "",
};

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_ENVIO: "Aguardando envio",
  ENVIADA_OPERADORA: "Enviada à operadora",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
  ATIVA: "Ativa",
};

const STATUS_COLORS: Record<string, string> = {
  ATIVA: "border-emerald-300 bg-emerald-50 text-emerald-700",
  AGUARDANDO_ENVIO: "border-amber-300 bg-amber-50 text-amber-700",
  ENVIADA_OPERADORA: "border-blue-300 bg-blue-50 text-blue-700",
  ACEITA: "border-teal-300 bg-teal-50 text-teal-700",
  RECUSADA: "border-red-300 bg-red-50 text-red-700",
};

// Transições permitidas por status
const PROXIMOS_STATUS: Record<string, string[]> = {
  AGUARDANDO_ENVIO: ["ENVIADA_OPERADORA", "RECUSADA"],
  ENVIADA_OPERADORA: ["ACEITA", "RECUSADA"],
  ACEITA: ["ATIVA", "RECUSADA"],
  RECUSADA: [],
  ATIVA: [],
};

type PropostaAdmin = {
  id: string;
  status: string;
  dadosTitular: Record<string, unknown>;
  valorTotal: string | null;
  createdAt: string;
  vendedorId: string;
  vendedorNome: string | null;
  vendedorEmail: string | null;
  dataEnvioOperadora: string | null;
  dataAtivacao: string | null;
  motivoRecusa: string | null;
  contratoId: string | null;
  contratoNome: string | null;
  responsavelFinanceiroId: string | null;
  responsavelNome: string | null;
  responsavelTipo: "PF" | "PJ" | null;
};

export default function AdminPropostas() {
  const [propostas, setPropostas] = useState<PropostaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const [propostaEditando, setPropostaEditando] = useState<PropostaAdmin | null>(null);
  const [novoStatus, setNovoStatus] = useState("");
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Edit dados
  const [dadosEditando, setDadosEditando] = useState<PropostaAdmin | null>(null);
  const [dadosForm, setDadosForm] = useState({ nome: "", cpf: "", telefone: "", plano: "", codigoPlano: "", observacao: "", formaPagamento: "", valorTotal: "", nomeMae: "", rg: "", rgOrgaoEmissor: "", rgUf: "CE", estadoCivil: "", diaVencimento: "", valorMensal: "" });
  const [dadosSalvando, setDadosSalvando] = useState(false);
  const [dadosErro, setDadosErro] = useState("");

  // Campos de ativação
  const [matricula, setMatricula] = useState("");
  const [dataAtivacao, setDataAtivacao] = useState("");
  const [planoCodeSelecionado, setPlanoCodeSelecionado] = useState("");
  const [planoCodeManual, setPlanoCodeManual] = useState("");
  const [usarManual, setUsarManual] = useState(false);

  const carregarPropostas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/propostas") as { propostas: PropostaAdmin[] };
      setPropostas(data.propostas ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregarPropostas(); }, [carregarPropostas]);

  const vendedores = useMemo(() => Array.from(new Set(propostas.map(p => p.vendedorNome ?? "—"))), [propostas]);

  const filteredPropostas = useMemo(() => {
    return propostas.filter(p => {
      const nome = String(p.dadosTitular?.nome ?? "").toLowerCase();
      const cpf = String(p.dadosTitular?.cpf ?? "");
      const vendedor = p.vendedorNome ?? "";
      const matchSearch = nome.includes(search.toLowerCase()) || cpf.includes(search);
      const matchVendedor = vendedorFilter === "TODOS" || vendedor === vendedorFilter;
      const matchStatus = statusFilter === "TODOS" || p.status === statusFilter;
      return matchSearch && matchVendedor && matchStatus;
    });
  }, [search, vendedorFilter, statusFilter, propostas]);

  const handleAbrirEdicao = (p: PropostaAdmin) => {
    setPropostaEditando(p);
    setNovoStatus("");
    setMotivoRecusa("");
    setMatricula("");
    setDataAtivacao(new Date().toISOString().split("T")[0]);
    setPlanoCodeSelecionado("");
    setPlanoCodeManual("");
    setUsarManual(false);
    setErro("");
  };

  const handleAtualizarStatus = async () => {
    if (!propostaEditando || !novoStatus) return;
    setSalvando(true);
    setErro("");
    try {
      if (novoStatus === "ATIVA") {
        const codigoFinal = usarManual ? planoCodeManual : planoCodeSelecionado;
        await apiFetch(`/admin/propostas/${propostaEditando.id}/ativar`, {
          method: "PATCH",
          body: JSON.stringify({ matricula, dataAtivacao, planoCode: codigoFinal }),
        });
      } else {
        await apiFetch(`/admin/propostas/${propostaEditando.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: novoStatus, motivoRecusa }),
        });
      }
      await carregarPropostas();
      setPropostaEditando(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  const handleAbrirDadosEdicao = (p: PropostaAdmin) => {
    const dt = p.dadosTitular as Record<string, unknown>;
    setDadosEditando(p);
    setDadosErro("");
    setDadosForm({
      nome: String(dt.nome ?? ""),
      cpf: String(dt.cpf ?? ""),
      telefone: String(dt.telefone ?? ""),
      plano: String(dt.plano ?? ""),
      codigoPlano: String(dt.codigoPlano ?? ""),
      observacao: String(dt.observacao ?? ""),
      formaPagamento: String(dt.formaPagamento ?? ""),
      valorTotal: p.valorTotal ?? "",
      nomeMae: String(dt.nomeMae ?? ""),
      rg: String(dt.rg ?? ""),
      rgOrgaoEmissor: String(dt.rgOrgaoEmissor ?? ""),
      rgUf: String(dt.rgUf ?? "CE"),
      estadoCivil: String(dt.estadoCivil ?? ""),
      diaVencimento: dt.diaVencimento != null ? String(dt.diaVencimento) : "",
      valorMensal: String(dt.valorMensal ?? ""),
    });
  };

  const handleSalvarDados = async () => {
    if (!dadosEditando) return;
    setDadosSalvando(true);
    setDadosErro("");
    try {
      await apiFetch(`/admin/propostas/${dadosEditando.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          dadosTitular: {
            nome: dadosForm.nome,
            cpf: dadosForm.cpf,
            telefone: dadosForm.telefone,
            plano: dadosForm.plano,
            codigoPlano: dadosForm.codigoPlano,
            observacao: dadosForm.observacao,
            formaPagamento: dadosForm.formaPagamento,
            nomeMae: dadosForm.nomeMae,
            rg: dadosForm.rg,
            rgOrgaoEmissor: dadosForm.rgOrgaoEmissor,
            rgUf: dadosForm.rgUf,
            estadoCivil: dadosForm.estadoCivil,
            diaVencimento: dadosForm.diaVencimento ? Number(dadosForm.diaVencimento) : null,
            valorMensal: dadosForm.valorMensal || null,
          },
          valorTotal: dadosForm.valorTotal || undefined,
        }),
      });
      await carregarPropostas();
      setDadosEditando(null);
    } catch (err: unknown) {
      setDadosErro(err instanceof Error ? err.message : String(err));
    } finally {
      setDadosSalvando(false);
    }
  };

  const proximosStatus = propostaEditando ? (PROXIMOS_STATUS[propostaEditando.status] ?? []) : [];
  const planoCodeFinal = usarManual ? planoCodeManual : planoCodeSelecionado;
  const podeAtivar = novoStatus === "ATIVA"
    ? matricula.replace(/\D/g, "").length === 14 && !!dataAtivacao && planoCodeFinal.trim().length >= 4
    : !!novoStatus;

  // Gerar boleto
  const [gerandoBoletoId, setGerandoBoletoId] = useState<string | null>(null);
  const [boletoCriadoId, setBoletoCriadoId] = useState<string | null>(null);
  const [boletoErro, setBoletoErro] = useState<string | null>(null);

  const handleGerarBoleto = async (propostaId: string) => {
    setGerandoBoletoId(propostaId);
    setBoletoErro(null);
    setBoletoCriadoId(null);
    try {
      await apiFetch(`/admin/propostas/${propostaId}/gerar-boleto`, { method: "POST" });
      setBoletoCriadoId(propostaId);
      setTimeout(() => setBoletoCriadoId(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBoletoErro(msg);
      setTimeout(() => setBoletoErro(null), 4000);
    } finally {
      setGerandoBoletoId(null);
    }
  };

  // ─── NOVA PROPOSTA (admin) ────────────────────────────────────
  const [novaAberta, setNovaAberta] = useState(false);
  const [novaStep, setNovaStep] = useState<1 | 2 | 3>(1);
  const [vendedoresList, setVendedoresList] = useState<VendedorSelect[]>([]);
  const [planosList, setPlanosList] = useState<PlanoSelect[]>([]);
  const [contratosList, setContratosList] = useState<ContratoSelect[]>([]);
  const [responsaveisList, setResponsaveisList] = useState<ResponsavelSelect[]>([]);
  const [novaSalvando, setNovaSalvando] = useState(false);
  const [novaSalvo, setNovaSalvo] = useState(false);
  const [novaErro, setNovaErro] = useState("");
  const [novaForm, setNovaForm] = useState({ ...NOVA_FORM_INIT });
  // IA
  const [nIaAberta, setNIaAberta] = useState(false);
  const [nIaTexto, setNIaTexto] = useState("");
  const [nIaAnalisando, setNIaAnalisando] = useState(false);
  const [nIaPreenchido, setNIaPreenchido] = useState(false);
  const [nIaErro, setNIaErro] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/admin/vendedores") as Promise<{ vendedores: VendedorSelect[] }>,
      apiFetch("/planos") as Promise<{ planos: PlanoSelect[] }>,
      apiFetch("/admin/contratos") as Promise<{ contratos: ContratoSelect[] }>,
      apiFetch("/admin/responsaveis") as Promise<{ responsaveis: ResponsavelSelect[] }>,
    ]).then(([v, p, c, r]) => {
      setVendedoresList(v.vendedores ?? []);
      setPlanosList((p.planos ?? []).filter(pl => pl.ativo));
      setContratosList((c.contratos ?? []).filter(ct => ct.ativo));
      setResponsaveisList(r.responsaveis ?? []);
    }).catch(console.error);
  }, []);

  const handleAnalisarIA = async () => {
    if (!nIaTexto.trim()) return;
    setNIaAnalisando(true); setNIaErro(""); setNIaPreenchido(false);
    try {
      const res = await apiFetch("/ai/parse-cliente", {
        method: "POST",
        body: JSON.stringify({ texto: nIaTexto }),
      }) as { dados: Record<string, string | null> };
      const d = res.dados ?? {};
      setNovaForm(f => ({
        ...f,
        clienteNome: d.nome ?? f.clienteNome,
        clienteCpf: d.cpf ?? f.clienteCpf,
        dataNascimento: d.dataNascimento ?? f.dataNascimento,
        sexo: d.sexo ?? f.sexo,
        telefone: d.telefone ?? f.telefone,
        email: d.email ?? f.email,
        cep: d.cep ?? f.cep,
        logradouro: d.logradouro ?? f.logradouro,
        numero: d.numero ?? f.numero,
        bairro: d.bairro ?? f.bairro,
        cidade: d.cidade ?? f.cidade,
        estado: d.estado ?? f.estado,
        nomeMae: d.nomeMae ?? f.nomeMae,
        rg: d.rg ?? f.rg,
        rgOrgaoEmissor: d.rgOrgaoEmissor ?? f.rgOrgaoEmissor,
        rgUf: d.rgUf ?? f.rgUf,
        estadoCivil: d.estadoCivil ?? f.estadoCivil,
        formaPagamento: d.formaPagamento ?? f.formaPagamento,
        diaVencimento: d.diaVencimento != null ? String(d.diaVencimento) : f.diaVencimento,
        valorManual: d.valorMensal != null ? String(d.valorMensal) : f.valorManual,
      }));
      setNIaPreenchido(true);
      setTimeout(() => setNIaAberta(false), 1200);
    } catch (err: unknown) {
      setNIaErro(err instanceof Error ? err.message : "Não foi possível analisar o texto.");
    } finally {
      setNIaAnalisando(false);
    }
  };

  const addDep = () => setNovaForm(f => ({
    ...f,
    dependentes: [...f.dependentes, { _id: `d${Date.now()}`, nome: "", cpf: "", dataNascimento: "", grauParentesco: "FILHO(A)" }],
  }));
  const removeDep = (id: string) => setNovaForm(f => ({ ...f, dependentes: f.dependentes.filter(d => d._id !== id) }));
  const updateDep = (id: string, field: string, val: string) => setNovaForm(f => ({
    ...f, dependentes: f.dependentes.map(d => d._id === id ? { ...d, [field]: val } : d),
  }));

  const handleNovaSalvar = async () => {
    setNovaSalvando(true); setNovaErro("");
    try {
      const plano = planosList.find(p => p.id === novaForm.planoId);
      await apiFetch("/admin/propostas", {
        method: "POST",
        body: JSON.stringify({
          vendedorId: novaForm.vendedorId,
          contratoId: novaForm.contratoId,
          responsavelFinanceiroId: novaForm.responsavelFinanceiroId,
          dadosTitular: {
            nome: novaForm.clienteNome.toUpperCase(),
            cpf: novaForm.clienteCpf,
            dataNascimento: novaForm.dataNascimento,
            sexo: novaForm.sexo,
            telefone: novaForm.telefone,
            email: novaForm.email,
            cep: novaForm.cep,
            logradouro: novaForm.logradouro,
            numero: novaForm.numero,
            bairro: novaForm.bairro,
            cidade: novaForm.cidade,
            estado: novaForm.estado,
            nomeMae: novaForm.nomeMae,
            rg: novaForm.rg,
            rgOrgaoEmissor: novaForm.rgOrgaoEmissor,
            rgUf: novaForm.rgUf,
            estadoCivil: novaForm.estadoCivil,
            tipo: "TITULAR",
            plano: plano?.nome ?? "",
            codigoPlano: plano?.codigo ?? "",
            formaPagamento: novaForm.formaPagamento,
            diaVencimento: novaForm.diaVencimento ? Number(novaForm.diaVencimento) : null,
            valorMensal: novaForm.valorManual ? novaForm.valorManual.replace(",", ".") : null,
            observacao: novaForm.observacao,
          },
          dadosDependentes: novaForm.dependentes.map(d => ({
            nome: d.nome.toUpperCase(), cpf: d.cpf,
            dataNascimento: d.dataNascimento, grauParentesco: d.grauParentesco, tipo: "DEPENDENTE",
          })),
          valorTotal: novaForm.valorManual.replace(",", ".") || null,
        }),
      });
      setNovaSalvo(true);
      await carregarPropostas();
      setTimeout(() => {
        setNovaSalvo(false); setNovaAberta(false); setNovaStep(1);
        setNovaForm({ ...NOVA_FORM_INIT });
        setNIaTexto(""); setNIaAberta(false); setNIaPreenchido(false);
      }, 1500);
    } catch (err: unknown) {
      setNovaErro(err instanceof Error ? err.message : String(err));
    } finally {
      setNovaSalvando(false);
    }
  };

  const handleNovaFechar = () => {
    setNovaAberta(false); setNovaStep(1); setNovaForm({ ...NOVA_FORM_INIT });
    setNIaTexto(""); setNIaAberta(false); setNIaPreenchido(false);
    setNovaErro(""); setNovaSalvo(false);
  };

  const novaPlanoAtual = planosList.find(p => p.id === novaForm.planoId);
  const novaPodeAvancar1 = !!novaForm.vendedorId && !!novaForm.contratoId && !!novaForm.responsavelFinanceiroId && !!novaForm.clienteNome && !!novaForm.clienteCpf;
  const novaPodeSalvar = novaPodeAvancar1 && !!novaForm.planoId;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Propostas</h2>
          <p className="text-muted-foreground">Acompanhamento do funil de vendas e envios para operadora.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2" onClick={() => setNovaAberta(true)} data-testid="btn-nova-proposta-admin">
            <Plus className="h-4 w-4" /> Nova Proposta
          </Button>
          <Button variant="outline" size="sm" onClick={carregarPropostas} className="gap-2" data-testid="btn-reload-propostas">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 bg-muted/20">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Nome ou CPF..." className="pl-9 bg-background" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-propostas" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Vendedor</label>
              <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os vendedores</SelectItem>
                  {vendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {boletoErro && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>Erro ao gerar boleto:</strong> {boletoErro}</span>
        </div>
      )}

      <Card className="border shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2">
                <TableHead className="font-semibold text-foreground">Cliente / CPF</TableHead>
                <TableHead className="font-semibold text-foreground">Plano</TableHead>
                <TableHead className="font-semibold text-foreground">Contrato / Resp.</TableHead>
                <TableHead className="font-semibold text-foreground">Vendedor</TableHead>
                <TableHead className="font-semibold text-foreground">Data</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Valor</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPropostas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-8 w-8 text-muted-foreground/30" />
                      <p>Nenhuma proposta encontrada.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPropostas.map(prop => (
                <TableRow key={prop.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-proposta-${prop.id}`}>
                  <TableCell className="font-medium py-4">
                    <div className="flex flex-col gap-0.5">
                      <span>{String(prop.dadosTitular?.nome ?? "—")}</span>
                      <span className="text-xs text-muted-foreground font-mono">{String(prop.dadosTitular?.cpf ?? "—")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{String(prop.dadosTitular?.plano ?? "—")}</span>
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded w-fit">
                        {String(prop.dadosTitular?.codigoPlano ?? prop.dadosTitular?.planoCode ?? "—")}
                      </span>
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
                      ) : <span className="text-xs text-muted-foreground">— sem responsável</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{prop.vendedorNome ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {prop.createdAt ? new Date(prop.createdAt).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="font-bold text-right">
                    {formatMoney(parseFloat(prop.valorTotal ?? "0"))}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`font-medium border whitespace-nowrap ${STATUS_COLORS[prop.status] ?? ""}`}>
                      {STATUS_LABEL[prop.status] ?? prop.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground" onClick={() => handleAbrirDadosEdicao(prop)} data-testid={`btn-editar-dados-proposta-${prop.id}`}>
                        Dados
                      </Button>
                      {PROXIMOS_STATUS[prop.status]?.length > 0 && (
                        <Button size="sm" variant="outline" onClick={() => handleAbrirEdicao(prop)} data-testid={`btn-editar-proposta-${prop.id}`}>
                          Status
                        </Button>
                      )}
                      {prop.status === "ATIVA" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className={`gap-1 ${boletoCriadoId === prop.id ? "border-emerald-400 text-emerald-700 bg-emerald-50" : "border-blue-300 text-blue-700 hover:bg-blue-50"}`}
                          onClick={() => handleGerarBoleto(prop.id)}
                          disabled={gerandoBoletoId === prop.id}
                          data-testid={`btn-gerar-boleto-${prop.id}`}
                        >
                          {gerandoBoletoId === prop.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Receipt className="h-3.5 w-3.5" />}
                          {boletoCriadoId === prop.id ? "Criado!" : "Boleto"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ─── MODAL NOVA PROPOSTA (ADMIN) ─── */}
      <Dialog open={novaAberta} onOpenChange={handleNovaFechar}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Nova Proposta
            </DialogTitle>
            <DialogDescription>Cadastre um novo cliente e gere uma proposta para envio à operadora.</DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-2 py-1">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${novaStep >= s ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"}`}>
                  {novaStep > s ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                <span className={`text-xs font-medium ${novaStep >= s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Titular" : s === 2 ? "Plano + Depend." : "Revisão"}
                </span>
                {s < 3 && <div className="h-px w-6 bg-muted-foreground/30" />}
              </div>
            ))}
          </div>

          {/* STEP 1 — Vendedor + Titular */}
          {novaStep === 1 && (
            <div className="space-y-4 py-1">
              {/* Vendedor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Vendedor *</Label>
                  <Select value={novaForm.vendedorId} onValueChange={v => setNovaForm(f => ({ ...f, vendedorId: v }))}>
                    <SelectTrigger data-testid="select-nova-vendedor"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {vendedoresList.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Contrato *</Label>
                  <Select value={novaForm.contratoId} onValueChange={v => setNovaForm(f => ({ ...f, contratoId: v }))}>
                    <SelectTrigger data-testid="select-nova-contrato"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {contratosList.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome} {c.asaasModo === "SANDBOX" && "(sandbox)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Resp. Financeiro *</Label>
                  <Select value={novaForm.responsavelFinanceiroId} onValueChange={v => setNovaForm(f => ({ ...f, responsavelFinanceiroId: v }))}>
                    <SelectTrigger data-testid="select-nova-responsavel"><SelectValue placeholder="Quem paga?" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {responsaveisList.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nome} <span className="text-xs text-muted-foreground">({r.tipo})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cola IA */}
              <div className="rounded-lg border border-violet-200 bg-violet-50/60">
                <button type="button"
                  onClick={() => { setNIaAberta(p => !p); setNIaErro(""); }}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-violet-800 hover:bg-violet-100/60 rounded-lg transition-colors"
                  data-testid="btn-nova-colar-ia">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    Colar dados com IA
                    <span className="text-xs font-normal text-violet-600">— cole texto e a IA preenche o formulário</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-violet-500 transition-transform ${nIaAberta ? "rotate-180" : ""}`} />
                </button>
                {nIaAberta && (
                  <div className="px-4 pb-4 space-y-3">
                    <Textarea placeholder="Cole aqui qualquer texto com dados do cliente: mensagem de WhatsApp, e-mail, planilha colada, etc."
                      value={nIaTexto}
                      onChange={e => { setNIaTexto(e.target.value); setNIaPreenchido(false); setNIaErro(""); }}
                      className="resize-none bg-white text-sm min-h-[100px]" rows={4}
                      data-testid="textarea-nova-ia" />
                    {nIaErro && <p className="text-xs text-red-600 flex items-center gap-1"><X className="h-3 w-3" />{nIaErro}</p>}
                    {nIaPreenchido && <p className="text-xs text-emerald-700 flex items-center gap-1"><Check className="h-3 w-3" /> Dados preenchidos! Confira abaixo.</p>}
                    <Button size="sm" onClick={handleAnalisarIA} disabled={nIaAnalisando || !nIaTexto.trim()}
                      className="gap-2 bg-violet-600 hover:bg-violet-700" data-testid="btn-nova-analisar-ia">
                      {nIaAnalisando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analisando...</> : <><Sparkles className="h-3.5 w-3.5" />Analisar</>}
                    </Button>
                  </div>
                )}
              </div>

              {/* Campos titular */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome Completo *</Label>
                  <Input placeholder="NOME COMPLETO" value={novaForm.clienteNome}
                    onChange={e => setNovaForm(f => ({ ...f, clienteNome: e.target.value }))} data-testid="input-nova-nome" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CPF *</Label>
                  <Input placeholder="000.000.000-00" value={novaForm.clienteCpf}
                    onChange={e => setNovaForm(f => ({ ...f, clienteCpf: e.target.value }))} data-testid="input-nova-cpf" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data de Nascimento</Label>
                  <Input type="date" value={novaForm.dataNascimento}
                    onChange={e => setNovaForm(f => ({ ...f, dataNascimento: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sexo</Label>
                  <Select value={novaForm.sexo} onValueChange={v => setNovaForm(f => ({ ...f, sexo: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Telefone / WhatsApp</Label>
                  <Input placeholder="(85) 99999-9999" value={novaForm.telefone}
                    onChange={e => setNovaForm(f => ({ ...f, telefone: e.target.value }))} data-testid="input-nova-telefone" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">E-mail</Label>
                  <Input type="email" placeholder="email@exemplo.com" value={novaForm.email}
                    onChange={e => setNovaForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CEP</Label>
                  <Input placeholder="00000-000" value={novaForm.cep}
                    onChange={e => setNovaForm(f => ({ ...f, cep: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Número</Label>
                  <Input placeholder="123" value={novaForm.numero}
                    onChange={e => setNovaForm(f => ({ ...f, numero: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Logradouro</Label>
                  <Input placeholder="Rua..." value={novaForm.logradouro}
                    onChange={e => setNovaForm(f => ({ ...f, logradouro: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bairro</Label>
                  <Input value={novaForm.bairro} onChange={e => setNovaForm(f => ({ ...f, bairro: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cidade</Label>
                  <Input value={novaForm.cidade} onChange={e => setNovaForm(f => ({ ...f, cidade: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Estado (UF)</Label>
                  <Input placeholder="CE" maxLength={2} value={novaForm.estado}
                    onChange={e => setNovaForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} />
                </div>
              </div>

              {/* Dados pessoais adicionais (Hapvida) */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-3">
                <p className="text-xs font-semibold text-amber-800">Dados Pessoais Adicionais (Hapvida)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Estado Civil</Label>
                    <Select value={novaForm.estadoCivil} onValueChange={v => setNovaForm(f => ({ ...f, estadoCivil: v }))}>
                      <SelectTrigger data-testid="select-nova-estado-civil"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                        <SelectItem value="CASADO">Casado(a)</SelectItem>
                        <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                        <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                        <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">Nome da Mãe</Label>
                    <Input placeholder="Nome completo da mãe" value={novaForm.nomeMae}
                      onChange={e => setNovaForm(f => ({ ...f, nomeMae: e.target.value }))} data-testid="input-nova-nome-mae" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">RG</Label>
                    <Input value={novaForm.rg} onChange={e => setNovaForm(f => ({ ...f, rg: e.target.value }))} data-testid="input-nova-rg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Órgão Emissor</Label>
                    <Input placeholder="SSP" value={novaForm.rgOrgaoEmissor}
                      onChange={e => setNovaForm(f => ({ ...f, rgOrgaoEmissor: e.target.value }))} data-testid="input-nova-rg-orgao" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">UF do RG</Label>
                    <Select value={novaForm.rgUf} onValueChange={v => setNovaForm(f => ({ ...f, rgUf: v }))}>
                      <SelectTrigger data-testid="select-nova-rg-uf"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {UFS_BR.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Plano + Dependentes */}
          {novaStep === 2 && (
            <div className="space-y-5 py-1">
              {/* Plano */}
              <div className="space-y-1.5">
                <Label>Plano de Saúde *</Label>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {planosList.map(p => (
                    <button key={p.id} onClick={() => setNovaForm(f => ({ ...f, planoId: p.id }))}
                      data-testid={`btn-nova-plano-${p.codigo}`}
                      className={`p-3 rounded-lg border text-left transition-all ${novaForm.planoId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
                      <div className="font-mono font-bold text-sm">{p.codigo ?? "—"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">{p.nome}</div>
                      {p.valorTitular && (
                        <div className="text-xs font-semibold text-primary mt-1">R$ {parseFloat(p.valorTitular).toFixed(2).replace(".", ",")}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Forma pagamento + dia vencimento + valor */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Forma de Pagamento</Label>
                  <Select value={novaForm.formaPagamento} onValueChange={v => setNovaForm(f => ({ ...f, formaPagamento: v }))}>
                    <SelectTrigger data-testid="select-nova-pagamento"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Dia de Vencimento (1–31)</Label>
                  <Input type="number" min={1} max={31} placeholder="10" value={novaForm.diaVencimento}
                    onChange={e => setNovaForm(f => ({ ...f, diaVencimento: e.target.value }))}
                    data-testid="input-nova-dia-vencimento" />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor do Plano / Mensalidade (R$)</Label>
                  <Input placeholder="0,00" value={novaForm.valorManual}
                    onChange={e => setNovaForm(f => ({ ...f, valorManual: e.target.value }))}
                    data-testid="input-nova-valor" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea placeholder="Informações adicionais..." value={novaForm.observacao}
                    onChange={e => setNovaForm(f => ({ ...f, observacao: e.target.value }))}
                    className="resize-none" rows={2} />
                </div>
              </div>

              {/* Dependentes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Dependentes</Label>
                  <Button size="sm" variant="outline" onClick={addDep} className="gap-1.5 text-xs" data-testid="btn-nova-add-dep">
                    <UserPlus className="h-3.5 w-3.5" /> Adicionar
                  </Button>
                </div>
                {novaForm.dependentes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">Nenhum dependente adicionado.</p>
                ) : (
                  <div className="space-y-3">
                    {novaForm.dependentes.map((dep, i) => (
                      <div key={dep._id} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dependente {i + 1}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeDep(dep._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">Nome</Label>
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
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">Grau de Parentesco</Label>
                            <Select value={dep.grauParentesco} onValueChange={v => updateDep(dep._id, "grauParentesco", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GRAUS_PARENTESCO.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — Revisão */}
          {novaStep === 3 && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                <h3 className="font-semibold text-sm flex items-center gap-2">Dados do Titular</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{novaForm.clienteNome || "—"}</span></div>
                  <div><span className="text-muted-foreground">CPF:</span> <span className="font-mono">{novaForm.clienteCpf || "—"}</span></div>
                  <div><span className="text-muted-foreground">Nascimento:</span> <span>{novaForm.dataNascimento ? new Date(novaForm.dataNascimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</span></div>
                  <div><span className="text-muted-foreground">Telefone:</span> <span>{novaForm.telefone || "—"}</span></div>
                  {novaForm.email && <div className="col-span-2"><span className="text-muted-foreground">E-mail:</span> <span>{novaForm.email}</span></div>}
                  {novaForm.logradouro && <div className="col-span-2"><span className="text-muted-foreground">Endereço:</span> <span>{novaForm.logradouro}{novaForm.numero ? `, ${novaForm.numero}` : ""} — {novaForm.bairro} — {novaForm.cidade}/{novaForm.estado}</span></div>}
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
                <h3 className="font-semibold text-sm">Plano</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Vendedor:</span> <span className="font-medium">{vendedoresList.find(v => v.id === novaForm.vendedorId)?.nome ?? "—"}</span></div>
                  <div><span className="text-muted-foreground">Plano:</span> <span className="font-mono font-bold">{novaPlanoAtual?.codigo ?? "—"}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Nome:</span> <span>{novaPlanoAtual?.nome ?? "—"}</span></div>
                  <div><span className="text-muted-foreground">Forma Pagto:</span> <span>{novaForm.formaPagamento || "—"}</span></div>
                  <div><span className="text-muted-foreground">Valor Total:</span> <span className="font-bold text-primary">R$ {novaForm.valorManual || "—"}</span></div>
                </div>
              </div>
              {novaForm.dependentes.length > 0 && (
                <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
                  <h3 className="font-semibold text-sm">Dependentes ({novaForm.dependentes.length})</h3>
                  {novaForm.dependentes.map((d, i) => (
                    <div key={d._id} className="text-sm flex gap-3 py-1 border-t first:border-0">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span className="font-medium">{d.nome || "—"}</span>
                      <span className="text-muted-foreground font-mono text-xs">{d.cpf}</span>
                      <Badge variant="outline" className="text-xs ml-auto">{d.grauParentesco}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {novaSalvo && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
                  <Check className="h-5 w-5" /><span className="font-medium">Proposta cadastrada com sucesso!</span>
                </div>
              )}
              {novaErro && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{novaErro}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <div>{novaStep > 1 && !novaSalvo && <Button variant="outline" onClick={() => setNovaStep(s => (s - 1) as 1|2|3)}>Voltar</Button>}</div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleNovaFechar}>Cancelar</Button>
              {novaStep < 3 ? (
                <Button onClick={() => setNovaStep(s => (s + 1) as 1|2|3)}
                  disabled={novaStep === 1 && !novaPodeAvancar1}
                  data-testid="btn-nova-proximo">Próximo</Button>
              ) : (
                <Button onClick={handleNovaSalvar} disabled={novaSalvando || novaSalvo || !novaPodeSalvar}
                  data-testid="btn-nova-salvar">
                  {novaSalvando ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : novaSalvo ? "Salvo!" : "Registrar Proposta"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de atualização de status */}
      <Dialog open={!!propostaEditando} onOpenChange={() => setPropostaEditando(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atualizar Proposta</DialogTitle>
            <DialogDescription>
              {String(propostaEditando?.dadosTitular?.nome ?? "")} — Status atual:{" "}
              <Badge variant="outline" className={`ml-1 ${STATUS_COLORS[propostaEditando?.status ?? ""] ?? ""}`}>
                {STATUS_LABEL[propostaEditando?.status ?? ""] ?? propostaEditando?.status}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Novo status</Label>
              <Select value={novoStatus} onValueChange={v => { setNovoStatus(v); setErro(""); }}>
                <SelectTrigger data-testid="select-novo-status">
                  <SelectValue placeholder="Selecione o próximo status..." />
                </SelectTrigger>
                <SelectContent>
                  {proximosStatus.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {novoStatus === "RECUSADA" && (
              <div className="space-y-1.5">
                <Label>Motivo da recusa</Label>
                <Input
                  placeholder="Informe o motivo..."
                  value={motivoRecusa}
                  onChange={e => setMotivoRecusa(e.target.value)}
                  data-testid="input-motivo-recusa"
                />
              </div>
            )}

            {novoStatus === "ATIVA" && (
              <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Dados de Ativação — obrigatórios
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="matricula">
                    Código do Usuário <span className="text-xs text-muted-foreground">(14 dígitos)</span>
                  </Label>
                  <Input
                    id="matricula"
                    placeholder="00000000000000"
                    maxLength={14}
                    value={matricula}
                    onChange={e => setMatricula(e.target.value.replace(/\D/g, ""))}
                    className={`font-mono ${matricula && matricula.length !== 14 ? "border-red-400" : ""}`}
                    data-testid="input-matricula"
                  />
                  {matricula && matricula.length !== 14 && (
                    <p className="text-xs text-red-500">{matricula.length}/14 dígitos</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dataAtivacao">Data de Ativação</Label>
                  <Input
                    id="dataAtivacao"
                    type="date"
                    value={dataAtivacao}
                    onChange={e => setDataAtivacao(e.target.value)}
                    data-testid="input-data-ativacao"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Código do Plano <span className="text-xs text-muted-foreground">(4 dígitos)</span>
                  </Label>
                  {!usarManual ? (
                    <div className="space-y-2">
                      <Select value={planoCodeSelecionado} onValueChange={setPlanoCodeSelecionado}>
                        <SelectTrigger data-testid="select-plano-code">
                          <SelectValue placeholder="Selecione o plano..." />
                        </SelectTrigger>
                        <SelectContent>
                          {planos.map(p => (
                            <SelectItem key={p.codigo} value={p.codigo}>
                              <span className="font-mono font-bold">{p.codigo}</span>
                              <span className="ml-2 text-muted-foreground text-xs">{p.nome}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        className="text-xs text-primary underline underline-offset-2"
                        onClick={() => setUsarManual(true)}
                      >
                        Inserir código manualmente
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="Ex: 5254"
                        maxLength={6}
                        value={planoCodeManual}
                        onChange={e => setPlanoCodeManual(e.target.value)}
                        className="font-mono"
                        data-testid="input-plano-code-manual"
                      />
                      <button
                        type="button"
                        className="text-xs text-primary underline underline-offset-2"
                        onClick={() => { setUsarManual(false); setPlanoCodeManual(""); }}
                      >
                        Selecionar da lista
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {erro && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {erro}
              </div>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setPropostaEditando(null)}>Cancelar</Button>
            <Button
              onClick={handleAtualizarStatus}
              disabled={salvando || !podeAtivar}
              className={novoStatus === "ATIVA" ? "bg-emerald-600 hover:bg-emerald-700" : novoStatus === "RECUSADA" ? "bg-red-600 hover:bg-red-700" : ""}
              data-testid="btn-confirmar-status"
            >
              {salvando ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Dados da Proposta */}
      <Dialog open={!!dadosEditando} onOpenChange={() => setDadosEditando(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dados da Proposta</DialogTitle>
            <DialogDescription className="font-mono text-xs">{dadosEditando?.dadosTitular && String((dadosEditando.dadosTitular as Record<string, unknown>).cpf ?? "")} — {dadosEditando?.dadosTitular && String((dadosEditando.dadosTitular as Record<string, unknown>).nome ?? "")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <Input value={dadosForm.nome} onChange={e => setDadosForm(f => ({ ...f, nome: e.target.value }))} data-testid="input-dados-nome" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CPF</Label>
                <Input value={dadosForm.cpf} onChange={e => setDadosForm(f => ({ ...f, cpf: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <Input value={dadosForm.telefone} onChange={e => setDadosForm(f => ({ ...f, telefone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Plano (nome)</Label>
                <Input value={dadosForm.plano} onChange={e => setDadosForm(f => ({ ...f, plano: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Código do Plano</Label>
                <Input className="font-mono" value={dadosForm.codigoPlano} onChange={e => setDadosForm(f => ({ ...f, codigoPlano: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valor Total (R$)</Label>
                <Input type="number" step="0.01" value={dadosForm.valorTotal} onChange={e => setDadosForm(f => ({ ...f, valorTotal: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                <Select value={dadosForm.formaPagamento} onValueChange={v => setDadosForm(f => ({ ...f, formaPagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Dia de Vencimento (1–31)</Label>
                <Input type="number" min={1} max={31} placeholder="10" value={dadosForm.diaVencimento}
                  onChange={e => setDadosForm(f => ({ ...f, diaVencimento: e.target.value }))}
                  data-testid="input-dados-dia-vencimento" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valor do Plano / Mensalidade (R$)</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={dadosForm.valorMensal}
                  onChange={e => setDadosForm(f => ({ ...f, valorMensal: e.target.value }))}
                  data-testid="input-dados-valor-mensal" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Estado Civil</Label>
                <Select value={dadosForm.estadoCivil} onValueChange={v => setDadosForm(f => ({ ...f, estadoCivil: v }))}>
                  <SelectTrigger data-testid="select-dados-estado-civil"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                <Input value={dadosForm.nomeMae} onChange={e => setDadosForm(f => ({ ...f, nomeMae: e.target.value }))} data-testid="input-dados-nome-mae" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">RG</Label>
                <Input value={dadosForm.rg} onChange={e => setDadosForm(f => ({ ...f, rg: e.target.value }))} data-testid="input-dados-rg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Órgão Emissor</Label>
                <Input placeholder="SSP" value={dadosForm.rgOrgaoEmissor} onChange={e => setDadosForm(f => ({ ...f, rgOrgaoEmissor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">UF do RG</Label>
                <Select value={dadosForm.rgUf} onValueChange={v => setDadosForm(f => ({ ...f, rgUf: v }))}>
                  <SelectTrigger data-testid="select-dados-rg-uf"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {UFS_BR.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Observação</Label>
                <Textarea value={dadosForm.observacao} onChange={e => setDadosForm(f => ({ ...f, observacao: e.target.value }))} rows={2} />
              </div>
            </div>
            {dadosErro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{dadosErro}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDadosEditando(null)}>Cancelar</Button>
            <Button onClick={handleSalvarDados} disabled={dadosSalvando} data-testid="btn-salvar-dados-proposta">
              {dadosSalvando ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
