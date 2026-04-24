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
import { Search, SlidersHorizontal, Loader2, RefreshCw, AlertCircle, Receipt } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Propostas</h2>
          <p className="text-muted-foreground">Acompanhamento do funil de vendas e envios para operadora.</p>
        </div>
        <Button variant="outline" size="sm" onClick={carregarPropostas} className="gap-2" data-testid="btn-reload-propostas">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
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
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
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
                      {PROXIMOS_STATUS[prop.status]?.length > 0 && (
                        <Button size="sm" variant="outline" onClick={() => handleAbrirEdicao(prop)} data-testid={`btn-editar-proposta-${prop.id}`}>
                          Atualizar
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
    </div>
  );
}
