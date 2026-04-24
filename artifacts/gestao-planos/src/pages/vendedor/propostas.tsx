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
import { Search, SlidersHorizontal, Plus, Check, Loader2, Sparkles, X, ChevronDown } from "lucide-react";

type PlanoAPI = {
  id: string;
  codigo: string | null;
  nome: string;
  categoria: string | null;
  valorTitular: string | null;
  valorDependente: string | null;
  ativo: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_ENVIO: "Aguardando envio",
  ENVIADA_OPERADORA: "Enviada à operadora",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
  ATIVA: "Ativo",
};

const STATUS_COLORS: Record<string, string> = {
  ATIVA: "border-emerald-300 bg-emerald-50 text-emerald-700",
  AGUARDANDO_ENVIO: "border-amber-300 bg-amber-50 text-amber-700",
  ENVIADA_OPERADORA: "border-blue-300 bg-blue-50 text-blue-700",
  ACEITA: "border-teal-300 bg-teal-50 text-teal-700",
  RECUSADA: "border-red-300 bg-red-50 text-red-700",
};

const formasPagamento = ["BOLETO", "CORA", "C6", "BTG", "PIX", "DÉBITO EM FOLHA"];

function getNome(p: PropostaAPI) { return String((p.dadosTitular as Record<string, unknown>).nome ?? "—"); }
function getCpf(p: PropostaAPI) { return String((p.dadosTitular as Record<string, unknown>).cpf ?? "—"); }
function getPlanoNome(p: PropostaAPI) { return String((p.dadosTitular as Record<string, unknown>).plano ?? "—"); }
function getCodigoPlano(p: PropostaAPI) { return String((p.dadosTitular as Record<string, unknown>).codigoPlano ?? "—"); }

export default function VendedorPropostas() {
  const { propostas, loading, reload } = usePropostas();
  const [planosAPI, setPlanosAPI] = useState<PlanoAPI[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [novaPropostaAberta, setNovaPropostaAberta] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    (apiFetch("/planos") as Promise<{ planos: PlanoAPI[] }>)
      .then(d => setPlanosAPI((d.planos ?? []).filter(p => p.ativo)))
      .catch(console.error);
  }, []);

  // IA — colar dados
  const [iaAberta, setIaAberta] = useState(false);
  const [iaTexto, setIaTexto] = useState("");
  const [iaAnalisando, setIaAnalisando] = useState(false);
  const [iaErro, setIaErro] = useState("");
  const [iaPreenchido, setIaPreenchido] = useState(false);

  const [form, setForm] = useState({
    clienteNome: "",
    clienteCpf: "",
    telefone: "",
    tipo: "TITULAR" as "TITULAR" | "DEPENDENTE",
    codigoPlano: "",
    planoNome: "",
    formaPagamento: "",
    valorPrevisto: "",
    observacao: "",
  });

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

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSelecionarPlano = (codigo: string) => {
    const p = planosAPI.find(p => p.codigo === codigo);
    handleChange("codigoPlano", codigo);
    handleChange("planoNome", p?.nome ?? "");
    if (p?.valorTitular) handleChange("valorPrevisto", parseFloat(p.valorTitular).toFixed(2).replace(".", ","));
  };

  // IA: analisar texto colado
  const handleAnalisarIA = async () => {
    if (!iaTexto.trim()) return;
    setIaAnalisando(true);
    setIaErro("");
    setIaPreenchido(false);
    try {
      const res = await apiFetch("/ai/parse-cliente", {
        method: "POST",
        body: JSON.stringify({ texto: iaTexto }),
      }) as { dados: Record<string, string | null> };
      const dados = res.dados ?? {};
      setForm(prev => ({
        ...prev,
        clienteNome: dados.nome ?? prev.clienteNome,
        clienteCpf: dados.cpf ?? prev.clienteCpf,
        telefone: dados.telefone ?? prev.telefone,
      }));
      setIaPreenchido(true);
      // Fecha o painel de IA após 1.2s para o usuário confirmar os dados
      setTimeout(() => setIaAberta(false), 1200);
    } catch (err: unknown) {
      setIaErro(err instanceof Error ? err.message : "Não foi possível analisar o texto.");
    } finally {
      setIaAnalisando(false);
    }
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await apiFetch("/vendedor/propostas", {
        method: "POST",
        body: JSON.stringify({
          dadosTitular: {
            nome: form.clienteNome.toUpperCase(),
            cpf: form.clienteCpf,
            telefone: form.telefone,
            tipo: form.tipo,
            plano: form.planoNome,
            codigoPlano: form.codigoPlano,
            formaPagamento: form.formaPagamento,
            observacao: form.observacao,
          },
          dadosDependentes: [],
          valorTotal: form.valorPrevisto.replace(",", "."),
        }),
      });
      setSalvo(true);
      await reload();
      setTimeout(() => {
        setSalvo(false);
        setStep(1);
        setForm({ clienteNome: "", clienteCpf: "", telefone: "", tipo: "TITULAR", codigoPlano: "", planoNome: "", formaPagamento: "", valorPrevisto: "", observacao: "" });
        setNovaPropostaAberta(false);
        setIaTexto("");
        setIaAberta(false);
        setIaPreenchido(false);
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  const handleFechar = () => {
    setNovaPropostaAberta(false);
    setStep(1);
    setSalvo(false);
    setIaTexto("");
    setIaAberta(false);
    setIaPreenchido(false);
  };

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
              <TableHead className="font-semibold text-foreground">Envio</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Valor</TableHead>
              <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPropostas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground/30" />
                    <p>Nenhuma proposta encontrada com estes filtros.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredPropostas.map(prop => (
              <TableRow key={prop.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-proposta-vendedor-${prop.id}`}>
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Nova Proposta
            </DialogTitle>
            <DialogDescription>Preencha os dados do cliente e do plano para registrar a proposta.</DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-2 py-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step >= s ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"}`}>
                  {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Cliente" : s === 2 ? "Plano" : "Revisão"}
                </span>
                {s < 3 && <div className="h-px w-8 bg-muted-foreground/30" />}
              </div>
            ))}
          </div>

          {/* STEP 1 — Dados do Cliente */}
          {step === 1 && (
            <div className="grid gap-4 py-2">
              {/* Painel IA */}
              <div className="rounded-lg border border-violet-200 bg-violet-50/60">
                <button
                  type="button"
                  onClick={() => { setIaAberta(prev => !prev); setIaErro(""); }}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-violet-800 hover:bg-violet-100/60 rounded-lg transition-colors"
                  data-testid="btn-colar-dados-ia"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    Colar dados com IA
                    <span className="text-xs font-normal text-violet-600">— cole texto e a IA preenche o formulário</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-violet-500 transition-transform ${iaAberta ? "rotate-180" : ""}`} />
                </button>

                {iaAberta && (
                  <div className="px-4 pb-4 space-y-3">
                    <Textarea
                      placeholder="Cole aqui qualquer texto com dados do cliente: mensagem de WhatsApp, e-mail, planilha colada, etc."
                      value={iaTexto}
                      onChange={e => { setIaTexto(e.target.value); setIaPreenchido(false); setIaErro(""); }}
                      className="resize-none bg-white text-sm min-h-[100px]"
                      rows={4}
                      data-testid="textarea-ia-dados"
                    />
                    {iaErro && <p className="text-xs text-red-600 flex items-center gap-1"><X className="h-3 w-3" />{iaErro}</p>}
                    {iaPreenchido && (
                      <p className="text-xs text-emerald-700 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Dados preenchidos com sucesso! Confira abaixo.
                      </p>
                    )}
                    <Button
                      size="sm"
                      onClick={handleAnalisarIA}
                      disabled={iaAnalisando || !iaTexto.trim()}
                      className="gap-2 bg-violet-600 hover:bg-violet-700"
                      data-testid="btn-analisar-ia"
                    >
                      {iaAnalisando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analisando...</> : <><Sparkles className="h-3.5 w-3.5" /> Analisar</>}
                    </Button>
                  </div>
                )}
              </div>

              {/* Formulário manual */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="prop-nome">Nome Completo *</Label>
                  <Input id="prop-nome" placeholder="Nome do cliente" value={form.clienteNome} onChange={e => handleChange("clienteNome", e.target.value)} data-testid="input-proposta-nome" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prop-cpf">CPF *</Label>
                  <Input id="prop-cpf" placeholder="000.000.000-00" value={form.clienteCpf} onChange={e => handleChange("clienteCpf", e.target.value)} data-testid="input-proposta-cpf" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prop-tel">Telefone / WhatsApp</Label>
                  <Input id="prop-tel" placeholder="(85) 99999-9999" value={form.telefone} onChange={e => handleChange("telefone", e.target.value)} data-testid="input-proposta-telefone" />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de Beneficiário</Label>
                  <Select value={form.tipo} onValueChange={v => handleChange("tipo", v)}>
                    <SelectTrigger data-testid="select-proposta-tipo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TITULAR">Titular</SelectItem>
                      <SelectItem value="DEPENDENTE">Dependente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Plano */}
          {step === 2 && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Plano de Saúde *</Label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {planosAPI.length === 0 && (
                    <div className="col-span-2 flex items-center justify-center h-16 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando planos...
                    </div>
                  )}
                  {planosAPI.map(p => (
                    <button key={p.codigo} onClick={() => handleSelecionarPlano(p.codigo ?? "")} data-testid={`btn-proposta-plano-${p.codigo}`}
                      className={`p-3 rounded-lg border text-left transition-all ${form.codigoPlano === p.codigo ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
                      <div className="font-mono font-bold text-sm">{p.codigo ?? "—"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">{p.nome}</div>
                      <div className="text-xs font-semibold text-primary mt-1">
                        Tit: R$ {p.valorTitular ? parseFloat(p.valorTitular).toFixed(2).replace(".", ",") : "—"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.formaPagamento} onValueChange={v => handleChange("formaPagamento", v)}>
                    <SelectTrigger data-testid="select-proposta-pagamento"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {formasPagamento.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prop-valor">Valor Previsto (R$)</Label>
                  <Input id="prop-valor" value={form.valorPrevisto} onChange={e => handleChange("valorPrevisto", e.target.value)} placeholder="0,00" data-testid="input-proposta-valor" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea placeholder="Informações adicionais..." value={form.observacao} onChange={e => handleChange("observacao", e.target.value)} className="resize-none" rows={3} data-testid="textarea-proposta-obs" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Revisão */}
          {step === 3 && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                <h3 className="font-semibold text-sm">Dados do Cliente</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{form.clienteNome || "—"}</span></div>
                  <div><span className="text-muted-foreground">CPF:</span> <span className="font-mono">{form.clienteCpf || "—"}</span></div>
                  <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="outline" className="text-xs">{form.tipo}</Badge></div>
                  <div><span className="text-muted-foreground">Telefone:</span> <span>{form.telefone || "—"}</span></div>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                <h3 className="font-semibold text-sm">Plano Selecionado</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Código:</span> <span className="font-mono font-bold">{form.codigoPlano || "—"}</span></div>
                  <div><span className="text-muted-foreground">Pagamento:</span> <span>{form.formaPagamento || "—"}</span></div>
                  <div><span className="text-muted-foreground">Valor:</span> <span className="font-bold text-primary">R$ {form.valorPrevisto || "—"}</span></div>
                  <div><span className="text-muted-foreground">Status inicial:</span> <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-700">AGUARDANDO ENVIO</Badge></div>
                  {form.observacao && <div className="col-span-2"><span className="text-muted-foreground">Obs:</span> <span>{form.observacao}</span></div>}
                </div>
              </div>
              {salvo && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Proposta cadastrada com sucesso!</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <div>{step > 1 && <Button variant="outline" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}>Voltar</Button>}</div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleFechar}>Cancelar</Button>
              {step < 3 ? (
                <Button onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)} data-testid="btn-proximo-proposta">Próximo</Button>
              ) : (
                <Button className="bg-primary" onClick={handleSalvar} disabled={salvando || salvo || !form.clienteNome || !form.clienteCpf || !form.codigoPlano} data-testid="btn-salvar-proposta">
                  {salvando ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : salvo ? "Salvo!" : "Registrar Proposta"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
