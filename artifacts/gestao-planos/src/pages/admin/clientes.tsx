import { useState, useMemo, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import {
  Search, SlidersHorizontal, ChevronDown, ChevronUp,
  PlayCircle, PauseCircle, MessageCircle, Pencil, Loader2, RefreshCw,
  UserPlus, FileSignature, Users2, Building2, User as UserIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WhatsappModal } from "@/components/whatsapp-modal";
import CadastroCliente from "@/pages/admin/cadastro-cliente";

type ClienteAdminAPI = {
  id: string;
  nome: string;
  cpf: string;
  sexo?: string | null;
  dataNascimento?: string | null;
  telefone?: string | null;
  email?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  matricula?: string | null;
  valorMensal?: string | null;
  dataAtivacao?: string | null;
  codigo?: string | null;
  tipo: string;
  representante?: string | null;
  formaPagamento?: string | null;
  diaVencimento?: number | null;
  vrPl?: string | null;
  saldo?: string | null;
  valor2026?: string | null;
  comissao?: string | null;
  planoCode?: string | null;
  codigoPlano?: string | null;
  status: string;
  observacao?: string | null;
  vendedorId: string;
  vendedorNome?: string | null;
  contratoId?: string | null;
  contratoNome?: string | null;
  responsavelFinanceiroId?: string | null;
  responsavelNome?: string | null;
  responsavelTipo?: "PF" | "PJ" | null;
};

function statusBadge(status: string) {
  if (status === "ATIVO") return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (status === "SUSPENSO") return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-red-300 bg-red-50 text-red-700";
}

export default function AdminClientes() {
  const [clientes, setClientes] = useState<ClienteAdminAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState("TODOS");
  const [planoFilter, setPlanoFilter] = useState("TODOS");
  const [tipoFilter, setTipoFilter] = useState("TODOS");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [whatsappAberto, setWhatsappAberto] = useState(false);
  const [clienteWhatsapp, setClienteWhatsapp] = useState<ClienteAdminAPI | null>(null);

  const [novoAberto, setNovoAberto] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState<ClienteAdminAPI | null>(null);
  const [editSalvando, setEditSalvando] = useState(false);
  const [editErro, setEditErro] = useState("");
  const [editForm, setEditForm] = useState({
    nome: "", telefone: "", email: "", dataNascimento: "", sexo: "", tipo: "",
    cep: "", logradouro: "", numero: "", bairro: "", cidade: "", estado: "",
    matricula: "", planoCode: "", codigoPlano: "", valorMensal: "", dataAtivacao: "",
    formaPagamento: "", diaVencimento: "",
    vrPl: "", saldo: "", valor2026: "", comissao: "", representante: "",
    observacao: "",
  });

  const [togglendoId, setTogglendoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/clientes") as { clientes: ClienteAdminAPI[] };
      setClientes(data.clientes ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const vendedores = useMemo(() =>
    Array.from(new Set(clientes.map(c => c.vendedorNome ?? "—"))).filter(v => v !== "—").sort(), [clientes]);
  const planos = useMemo(() =>
    Array.from(new Set(clientes.map(c => c.planoCode ?? ""))).filter(Boolean).sort(), [clientes]);

  const filteredClientes = useMemo(() =>
    clientes.filter(c => {
      const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search);
      const matchVendedor = vendedorFilter === "TODOS" || (c.vendedorNome ?? "—") === vendedorFilter;
      const matchPlano = planoFilter === "TODOS" || c.planoCode === planoFilter;
      const matchTipo = tipoFilter === "TODOS" || c.tipo === tipoFilter;
      return matchSearch && matchVendedor && matchPlano && matchTipo;
    }), [search, vendedorFilter, planoFilter, tipoFilter, clientes]);

  const totalFiltrado = filteredClientes.length;
  const titularesFiltrados = filteredClientes.filter(c => c.tipo === "TITULAR").length;
  const dependentesFiltrados = filteredClientes.filter(c => c.tipo === "DEPENDENTE").length;

  const handleAbrirEdicao = (c: ClienteAdminAPI) => {
    setEditandoCliente(c);
    setEditErro("");
    setEditForm({
      nome: c.nome,
      telefone: c.telefone ?? "",
      email: c.email ?? "",
      dataNascimento: c.dataNascimento ?? "",
      sexo: c.sexo ?? "",
      tipo: c.tipo ?? "",
      cep: c.cep ?? "",
      logradouro: c.logradouro ?? "",
      numero: c.numero ?? "",
      bairro: c.bairro ?? "",
      cidade: c.cidade ?? "",
      estado: c.estado ?? "",
      matricula: c.matricula ?? "",
      planoCode: c.planoCode ?? "",
      codigoPlano: c.codigoPlano ?? "",
      valorMensal: c.valorMensal ?? "",
      dataAtivacao: c.dataAtivacao ? c.dataAtivacao.split("T")[0] : "",
      formaPagamento: c.formaPagamento ?? "",
      diaVencimento: c.diaVencimento != null ? String(c.diaVencimento) : "",
      vrPl: c.vrPl ?? "",
      saldo: c.saldo ?? "",
      valor2026: c.valor2026 ?? "",
      comissao: c.comissao ?? "",
      representante: c.representante ?? "",
      observacao: c.observacao ?? "",
    });
  };

  const handleSalvarEdicao = async () => {
    if (!editandoCliente) return;
    setEditSalvando(true);
    setEditErro("");
    try {
      await apiFetch(`/admin/clientes/${editandoCliente.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      await carregar();
      setEditandoCliente(null);
    } catch (err: unknown) {
      setEditErro(err instanceof Error ? err.message : String(err));
    } finally {
      setEditSalvando(false);
    }
  };

  const handleToggleStatus = async (c: ClienteAdminAPI) => {
    setTogglendoId(c.id);
    try {
      const novoStatus = c.status === "ATIVO" ? "SUSPENSO" : "ATIVO";
      await apiFetch(`/admin/clientes/${c.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: novoStatus }),
      });
      setClientes(prev => prev.map(cl => cl.id === c.id ? { ...cl, status: novoStatus } : cl));
    } catch (err) {
      console.error(err);
    } finally {
      setTogglendoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Clientes Ativos</h2>
          <p className="text-muted-foreground">Gerencie a carteira de clientes ativos da corretora.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={carregar} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setNovoAberto(true)} className="gap-2" data-testid="btn-novo-cliente">
            <UserPlus className="h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      <CadastroCliente open={novoAberto} onClose={() => setNovoAberto(false)} onCreated={carregar} />

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filtros</span>
          {(search || vendedorFilter !== "TODOS" || planoFilter !== "TODOS" || tipoFilter !== "TODOS") && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {totalFiltrado} resultado{totalFiltrado !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Nome ou CPF..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-clientes" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Vendedor</label>
            <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
              <SelectTrigger data-testid="select-vendedor">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os vendedores</SelectItem>
                {vendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Plano</label>
            <Select value={planoFilter} onValueChange={setPlanoFilter}>
              <SelectTrigger data-testid="select-plano">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os planos</SelectItem>
                {planos.map(p => <SelectItem key={p} value={p}>Plano {p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger data-testid="select-tipo">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="TITULAR">Titular</SelectItem>
                <SelectItem value="DEPENDENTE">Dependente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalFiltrado}</span> registros
          <span>•</span>
          <span className="text-blue-600 font-medium">{titularesFiltrados} titular{titularesFiltrados !== 1 ? "es" : ""}</span>
          <span>•</span>
          <span className="text-purple-600 font-medium">{dependentesFiltrados} dependente{dependentesFiltrados !== 1 ? "s" : ""}</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[32px]"></TableHead>
                <TableHead>Nome / CPF</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Venc.</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : filteredClientes.map(c => (
                <Collapsible
                  key={c.id}
                  asChild
                  open={expandedId === c.id}
                  onOpenChange={open => setExpandedId(open ? c.id : null)}
                >
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/30" data-testid={`row-cliente-${c.id}`}>
                      <TableCell className="pl-2 pr-0">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            {expandedId === c.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm leading-tight">{c.nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">{c.cpf}</div>
                      </TableCell>
                      <TableCell>
                        {c.tipo === "TITULAR" ? (
                          <Badge variant="outline" className="text-xs border-blue-300 bg-blue-50 text-blue-700">Titular</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-purple-300 bg-purple-50 text-purple-700">Depend.</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{c.vendedorNome ?? c.representante ?? "—"}</TableCell>
                      <TableCell>
                        {c.contratoNome ? (
                          <Badge variant="outline" className="text-xs gap-1 border-slate-300 bg-slate-50 text-slate-700">
                            <FileSignature className="h-3 w-3" /> {c.contratoNome}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {c.responsavelNome ? (
                          <Badge variant="outline" className={`text-xs gap-1 ${c.responsavelTipo === "PJ" ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-teal-300 bg-teal-50 text-teal-700"}`}>
                            {c.responsavelTipo === "PJ" ? <Building2 className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                            {c.responsavelNome}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs bg-muted/50">{c.planoCode ?? "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatMoney(parseFloat(c.valorMensal ?? "0"))}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">Dia {c.diaVencimento ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${statusBadge(c.status)}`}>{c.status}</Badge>
                      </TableCell>
                    </TableRow>

                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={10} className="p-0">
                          <div className="px-6 py-4 border-b">
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 text-sm mb-4">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b">Identificação</p>
                                {c.codigo && <p><span className="text-muted-foreground">Código:</span> <span className="font-mono text-xs bg-muted px-1 rounded">{c.codigo}</span></p>}
                                {c.dataNascimento && <p><span className="text-muted-foreground">Nasc.:</span> {new Date(c.dataNascimento).toLocaleDateString("pt-BR")}</p>}
                                {c.sexo && <p><span className="text-muted-foreground">Sexo:</span> {c.sexo === "M" ? "Masculino" : "Feminino"}</p>}
                                {c.dataAtivacao && <p><span className="text-muted-foreground">Ativação:</span> {new Date(c.dataAtivacao).toLocaleDateString("pt-BR")}</p>}
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b">Contato & Endereço</p>
                                <p><span className="text-muted-foreground">Telefone:</span> {c.telefone || "—"}</p>
                                {c.email && <p><span className="text-muted-foreground">E-mail:</span> <span className="text-xs">{c.email}</span></p>}
                                {c.cep && <p><span className="text-muted-foreground">CEP:</span> <span className="font-mono text-xs">{c.cep}</span></p>}
                                {c.logradouro && <p><span className="text-muted-foreground">Logradouro:</span> {c.logradouro}{c.numero ? `, ${c.numero}` : ""}</p>}
                                {c.bairro && <p><span className="text-muted-foreground">Bairro:</span> {c.bairro}</p>}
                                {(c.cidade || c.estado) && <p><span className="text-muted-foreground">Cidade/UF:</span> {c.cidade}/{c.estado}</p>}
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b">Plano & Contrato</p>
                                {c.contratoNome && <p><span className="text-muted-foreground">Contrato:</span> <span className="font-medium">{c.contratoNome}</span></p>}
                                {c.responsavelNome && <p><span className="text-muted-foreground">Resp. Financeiro:</span> <span className="font-medium">{c.responsavelNome}</span> <span className="text-xs text-muted-foreground">({c.responsavelTipo})</span></p>}
                                {c.planoCode && <p><span className="text-muted-foreground">Código Plano:</span> <span className="font-mono text-xs">{c.planoCode}</span></p>}
                                {c.codigoPlano && <p><span className="text-muted-foreground">Cód. Completo:</span> <span className="font-mono text-xs">{c.codigoPlano}</span></p>}
                                {c.matricula && <p><span className="text-muted-foreground">Carteirinha:</span> <span className="font-mono text-xs">{c.matricula}</span></p>}
                                {c.formaPagamento && <p><span className="text-muted-foreground">Pagamento:</span> {c.formaPagamento}</p>}
                                {c.diaVencimento && <p><span className="text-muted-foreground">Vencimento:</span> Dia {c.diaVencimento}</p>}
                                {c.representante && <p><span className="text-muted-foreground">Representante:</span> {c.representante}</p>}
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b">Financeiro</p>
                                {c.vrPl && <p><span className="text-muted-foreground">Valor 2025:</span> {formatMoney(parseFloat(c.vrPl))}</p>}
                                {c.valor2026 && <p><span className="text-muted-foreground">Valor 2026:</span> <span className="font-semibold">{formatMoney(parseFloat(c.valor2026))}</span></p>}
                                {c.saldo && <p><span className="text-muted-foreground">Saldo:</span> <span className="font-semibold text-emerald-600">{formatMoney(parseFloat(c.saldo))}</span></p>}
                                {c.comissao && parseFloat(c.comissao) > 0 && (
                                  <p><span className="text-muted-foreground">Comissão:</span> <span className="font-semibold text-amber-600">{formatMoney(parseFloat(c.comissao))}</span></p>
                                )}
                                {c.observacao && (
                                  <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Observação</p>
                                    <p className="text-xs text-amber-700 font-medium">{c.observacao}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-3 border-t">
                              <Button size="sm" variant="outline" className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                                onClick={() => handleAbrirEdicao(c)} data-testid={`btn-editar-cliente-${c.id}`}>
                                <Pencil className="h-3.5 w-3.5" /> Editar Dados
                              </Button>
                              <Button size="sm" variant="outline"
                                className={`gap-1.5 ${c.status === "ATIVO" ? "border-amber-300 text-amber-700 hover:bg-amber-50" : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"}`}
                                onClick={() => handleToggleStatus(c)}
                                disabled={togglendoId === c.id}
                                data-testid={`btn-toggle-status-${c.id}`}>
                                {togglendoId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                                  c.status === "ATIVO" ? <><PauseCircle className="h-3.5 w-3.5" /> Suspender</> : <><PlayCircle className="h-3.5 w-3.5" /> Reativar</>}
                              </Button>
                              {c.telefone && (
                                <Button size="sm" variant="outline" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                                  onClick={() => { setClienteWhatsapp(c); setWhatsappAberto(true); }}
                                  data-testid={`btn-whatsapp-cliente-${c.id}`}>
                                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal Editar */}
      <Dialog open={!!editandoCliente} onOpenChange={() => setEditandoCliente(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Editar Dados do Cliente
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{editandoCliente?.cpf} — {editandoCliente?.nome}</DialogDescription>
          </DialogHeader>
          {editandoCliente && (
            <div className="space-y-5 py-1 text-sm">

              {/* Dados Pessoais */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 border-b pb-1">Dados Pessoais</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                    <Input value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} data-testid="input-edit-nome" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data de Nascimento</Label>
                    <Input type="date" value={editForm.dataNascimento} onChange={e => setEditForm(f => ({ ...f, dataNascimento: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Sexo</Label>
                    <Select value={editForm.sexo} onValueChange={v => setEditForm(f => ({ ...f, sexo: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <Input value={editForm.telefone} onChange={e => setEditForm(f => ({ ...f, telefone: e.target.value }))} data-testid="input-edit-telefone" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <Select value={editForm.tipo} onValueChange={v => setEditForm(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TITULAR">Titular</SelectItem>
                        <SelectItem value="DEPENDENTE">Dependente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Representante</Label>
                    <Input value={editForm.representante} onChange={e => setEditForm(f => ({ ...f, representante: e.target.value }))} placeholder="Nome do representante" />
                  </div>
                </div>
              </div>

              {/* Plano */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 border-b pb-1">Plano de Saúde</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Matrícula (14 dígitos)</Label>
                    <Input className="font-mono" value={editForm.matricula} onChange={e => setEditForm(f => ({ ...f, matricula: e.target.value.replace(/\D/g, "") }))} maxLength={14} placeholder="00000000000000" data-testid="input-edit-matricula" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Código do Plano (4 dígitos)</Label>
                    <Input className="font-mono" value={editForm.planoCode} onChange={e => setEditForm(f => ({ ...f, planoCode: e.target.value }))} maxLength={4} placeholder="0000" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Código Completo do Plano</Label>
                    <Input className="font-mono" value={editForm.codigoPlano} onChange={e => setEditForm(f => ({ ...f, codigoPlano: e.target.value }))} placeholder="Ex: 406.000/57-4" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor Mensal (R$)</Label>
                    <Input type="number" step="0.01" value={editForm.valorMensal} onChange={e => setEditForm(f => ({ ...f, valorMensal: e.target.value }))} placeholder="0.00" data-testid="input-edit-valor-mensal" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data de Ativação</Label>
                    <Input type="date" value={editForm.dataAtivacao} onChange={e => setEditForm(f => ({ ...f, dataAtivacao: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                    <Select value={editForm.formaPagamento} onValueChange={v => setEditForm(f => ({ ...f, formaPagamento: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {["BOLETO", "PIX", "CARTAO"].map(fp => (
                          <SelectItem key={fp} value={fp}>{fp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Dia de Vencimento</Label>
                    <Input type="number" min={1} max={31} value={editForm.diaVencimento} onChange={e => setEditForm(f => ({ ...f, diaVencimento: e.target.value }))} placeholder="Ex: 10" />
                  </div>
                </div>
              </div>

              {/* Financeiro */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 border-b pb-1">Financeiro</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">VR/PL</Label>
                    <Input type="number" step="0.01" value={editForm.vrPl} onChange={e => setEditForm(f => ({ ...f, vrPl: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Saldo</Label>
                    <Input type="number" step="0.01" value={editForm.saldo} onChange={e => setEditForm(f => ({ ...f, saldo: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor 2026</Label>
                    <Input type="number" step="0.01" value={editForm.valor2026} onChange={e => setEditForm(f => ({ ...f, valor2026: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Comissão</Label>
                    <Input type="number" step="0.01" value={editForm.comissao} onChange={e => setEditForm(f => ({ ...f, comissao: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 border-b pb-1">Endereço</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CEP</Label>
                    <Input value={editForm.cep} onChange={e => setEditForm(f => ({ ...f, cep: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Número</Label>
                    <Input value={editForm.numero} onChange={e => setEditForm(f => ({ ...f, numero: e.target.value }))} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Logradouro</Label>
                    <Input value={editForm.logradouro} onChange={e => setEditForm(f => ({ ...f, logradouro: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Bairro</Label>
                    <Input value={editForm.bairro} onChange={e => setEditForm(f => ({ ...f, bairro: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cidade</Label>
                    <Input value={editForm.cidade} onChange={e => setEditForm(f => ({ ...f, cidade: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Estado (UF)</Label>
                    <Input value={editForm.estado} onChange={e => setEditForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} maxLength={2} placeholder="CE" />
                  </div>
                </div>
              </div>

              {/* Observação */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Observação</Label>
                <Textarea value={editForm.observacao} onChange={e => setEditForm(f => ({ ...f, observacao: e.target.value }))} rows={2} />
              </div>

              {editErro && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{editErro}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditandoCliente(null)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao} disabled={editSalvando}>
              {editSalvando ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {clienteWhatsapp && (
        <WhatsappModal
          open={whatsappAberto}
          onClose={() => { setWhatsappAberto(false); setClienteWhatsapp(null); }}
          clienteNome={clienteWhatsapp.nome}
          telefone={clienteWhatsapp.telefone ?? ""}
          valor={parseFloat(clienteWhatsapp.valorMensal ?? "0")}
          mesReferencia="Mês atual"
          vencimento={`Dia ${clienteWhatsapp.diaVencimento ?? "—"}`}
          clienteId={clienteWhatsapp.id}
        />
      )}
    </div>
  );
}
