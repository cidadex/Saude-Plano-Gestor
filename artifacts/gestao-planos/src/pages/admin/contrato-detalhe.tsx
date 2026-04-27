import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft, FileText, Users, BarChart2, AlertCircle,
  ShieldCheck, ShieldAlert, KeyRound, TrendingUp,
  CheckCircle2, XCircle, Clock, Loader2, Package,
  UserCircle, Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

type ContratoInfo = {
  id: string;
  nome: string;
  descricao: string | null;
  asaasModo: "SANDBOX" | "PRODUCAO";
  ativo: boolean;
  asaasApiKeyConfigured: boolean;
};

type ClienteStat = { status: string; total: number };
type PropostaStat = { status: string; total: number };

type PlanoUsado = {
  planoId: string;
  planoNome: string;
  planoCodigo: string | null;
  planoTipo: string;
  valorTitular: string | null;
  totalClientes: number;
};

type Vendedor = {
  vendedorId: string;
  vendedorNome: string;
  vendedorEmail: string;
  totalPropostas: number;
  totalClientes: number;
};

type Pendencia = {
  id: string;
  status: string;
  dadosTitular: Record<string, unknown>;
  valorTotal: string | null;
  createdAt: string;
  vendedorNome: string | null;
};

type DetalheContrato = {
  contrato: ContratoInfo;
  clientesStats: ClienteStat[];
  propostasStats: PropostaStat[];
  receitaMensal: string;
  planosUsados: PlanoUsado[];
  vendedores: Vendedor[];
  pendencias: Pendencia[];
};

// ─── Helpers ──────────────────────────────────────────────────

const STATUS_CLIENTE: Record<string, { label: string; color: string }> = {
  ATIVO: { label: "Ativo", color: "bg-emerald-100 text-emerald-700" },
  SUSPENSO: { label: "Suspenso", color: "bg-amber-100 text-amber-700" },
  CANCELADO: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  INADIMPLENTE: { label: "Inadimplente", color: "bg-orange-100 text-orange-700" },
};

const STATUS_PROPOSTA: Record<string, { label: string; color: string }> = {
  AGUARDANDO_ENVIO: { label: "Aguardando Envio", color: "bg-slate-100 text-slate-700" },
  EM_ANALISE: { label: "Em Análise", color: "bg-blue-100 text-blue-700" },
  ACEITA: { label: "Aceita", color: "bg-emerald-100 text-emerald-700" },
  RECUSADA: { label: "Recusada", color: "bg-red-100 text-red-700" },
  ATIVA: { label: "Ativa", color: "bg-teal-100 text-teal-700" },
};

function fmt(v: string | null | undefined): string {
  if (!v) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleDateString("pt-BR"); } catch { return s; }
}

// ─── Main Component ───────────────────────────────────────────

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [data, setData] = useState<DetalheContrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<DetalheContrato>(`/admin/contratos/${id}/detalhe`)
      .then(setData)
      .catch(e => setErro(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (erro || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/contratos")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <p className="text-sm text-destructive">{erro || "Contrato não encontrado."}</p>
      </div>
    );
  }

  const { contrato, clientesStats, propostasStats, receitaMensal, planosUsados, vendedores, pendencias } = data;

  const totalClientes = clientesStats.reduce((s, r) => s + r.total, 0);
  const totalAtivos = clientesStats.find(r => r.status === "ATIVO")?.total ?? 0;
  const totalSuspensos = clientesStats.find(r => r.status === "SUSPENSO")?.total ?? 0;
  const totalCancelados = clientesStats.find(r => r.status === "CANCELADO")?.total ?? 0;
  const totalPropostas = propostasStats.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/contratos")} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Contratos
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{contrato.nome}</span>
      </div>

      {/* Header do contrato */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            {contrato.nome}
          </h1>
          {contrato.descricao && (
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">{contrato.descricao}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={contrato.asaasModo === "PRODUCAO" ? "default" : "outline"}>
              {contrato.asaasModo === "PRODUCAO" ? "PRODUÇÃO" : "SANDBOX"}
            </Badge>
            {contrato.ativo ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                <ShieldCheck className="h-3 w-3 mr-1" /> Ativo
              </Badge>
            ) : (
              <Badge variant="secondary">Inativo</Badge>
            )}
            {contrato.asaasApiKeyConfigured ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <KeyRound className="h-3 w-3" /> Chave Asaas configurada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                <ShieldAlert className="h-3 w-3" /> Chave Asaas não configurada
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Clientes ativos</p>
            <p className="text-2xl font-bold text-emerald-600">{totalAtivos}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{totalClientes} no total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Receita mensal</p>
            <p className="text-xl font-bold text-primary">{fmt(receitaMensal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">clientes ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Propostas</p>
            <p className="text-2xl font-bold">{totalPropostas}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pendencias.length} em aberto</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Vendedores</p>
            <p className="text-2xl font-bold">{vendedores.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{planosUsados.length} planos</p>
          </CardContent>
        </Card>
      </div>

      {/* Abas */}
      <Tabs defaultValue={pendencias.length > 0 ? "pendencias" : "relatorios"}>
        <TabsList className="mb-1">
          <TabsTrigger value="relatorios" className="gap-1.5">
            <BarChart2 className="h-4 w-4" /> Relatórios
          </TabsTrigger>
          <TabsTrigger value="planos" className="gap-1.5">
            <Package className="h-4 w-4" /> Planos
          </TabsTrigger>
          <TabsTrigger value="vendedores" className="gap-1.5">
            <Users className="h-4 w-4" /> Vendedores
          </TabsTrigger>
          <TabsTrigger value="pendencias" className="gap-1.5 relative">
            <AlertCircle className="h-4 w-4" /> Pendências
            {pendencias.length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pendencias.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Relatórios ─── */}
        <TabsContent value="relatorios" className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Clientes por status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-muted-foreground" /> Clientes por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clientesStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum cliente</p>
                ) : (
                  <div className="space-y-2">
                    {clientesStats.map(row => {
                      const meta = STATUS_CLIENTE[row.status] ?? { label: row.status, color: "bg-slate-100 text-slate-700" };
                      const pct = totalClientes > 0 ? Math.round((row.total / totalClientes) * 100) : 0;
                      return (
                        <div key={row.status} className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-28 text-center ${meta.color}`}>{meta.label}</span>
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div className="h-2 rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold w-8 text-right">{row.total}</span>
                          <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Propostas por status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" /> Propostas por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {propostasStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma proposta</p>
                ) : (
                  <div className="space-y-2">
                    {propostasStats.map(row => {
                      const meta = STATUS_PROPOSTA[row.status] ?? { label: row.status, color: "bg-slate-100 text-slate-700" };
                      const pct = totalPropostas > 0 ? Math.round((row.total / totalPropostas) * 100) : 0;
                      return (
                        <div key={row.status} className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-32 text-center ${meta.color}`}>{meta.label}</span>
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div className="h-2 rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold w-8 text-right">{row.total}</span>
                          <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumo financeiro */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" /> Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Receita mensal (ativos)</p>
                  <p className="text-lg font-bold text-emerald-600">{fmt(receitaMensal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clientes ativos</p>
                  <p className="text-lg font-bold">{totalAtivos}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Suspensos</p>
                  <p className="text-lg font-bold text-amber-600">{totalSuspensos}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cancelados</p>
                  <p className="text-lg font-bold text-red-500">{totalCancelados}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Planos ─── */}
        <TabsContent value="planos">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" /> Planos em uso neste contrato
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planosUsados.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum plano em uso neste contrato.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase text-muted-foreground text-left">
                        <th className="py-2 pr-4 font-semibold">Plano</th>
                        <th className="py-2 pr-4 font-semibold">Código</th>
                        <th className="py-2 pr-4 font-semibold">Tipo</th>
                        <th className="py-2 pr-4 font-semibold">Valor Titular</th>
                        <th className="py-2 pr-2 font-semibold text-right">Clientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planosUsados.map(p => (
                        <tr key={p.planoId} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 pr-4 font-medium">{p.planoNome}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground font-mono text-xs">{p.planoCodigo ?? "—"}</td>
                          <td className="py-2.5 pr-4">
                            <Badge variant="outline" className="text-xs">{p.planoTipo.replace("_", " ")}</Badge>
                          </td>
                          <td className="py-2.5 pr-4">{fmt(p.valorTitular)}</td>
                          <td className="py-2.5 pr-2 text-right font-semibold">{p.totalClientes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Vendedores ─── */}
        <TabsContent value="vendedores">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" /> Vendedores neste contrato
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendedores.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum vendedor com atividade neste contrato.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase text-muted-foreground text-left">
                        <th className="py-2 pr-4 font-semibold">Vendedor</th>
                        <th className="py-2 pr-4 font-semibold">E-mail</th>
                        <th className="py-2 pr-4 font-semibold text-right">Clientes ativos</th>
                        <th className="py-2 pr-2 font-semibold text-right">Propostas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendedores.map(v => (
                        <tr key={v.vendedorId} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium">{v.vendedorNome}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground text-xs">{v.vendedorEmail}</td>
                          <td className="py-2.5 pr-4 text-right">
                            <span className="font-semibold text-emerald-600">{v.totalClientes}</span>
                          </td>
                          <td className="py-2.5 pr-2 text-right font-semibold">{v.totalPropostas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Pendências ─── */}
        <TabsContent value="pendencias">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" /> Propostas em aberto
                {pendencias.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{pendencias.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendencias.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="text-sm">Nenhuma pendência! Todas as propostas foram processadas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase text-muted-foreground text-left">
                        <th className="py-2 pr-4 font-semibold">Beneficiário</th>
                        <th className="py-2 pr-4 font-semibold">Status</th>
                        <th className="py-2 pr-4 font-semibold">Vendedor</th>
                        <th className="py-2 pr-4 font-semibold">Valor</th>
                        <th className="py-2 pr-2 font-semibold">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendencias.map(p => {
                        const meta = STATUS_PROPOSTA[p.status] ?? { label: p.status, color: "bg-slate-100 text-slate-700" };
                        const nome = String(p.dadosTitular?.nome ?? "—");
                        const cpf = String(p.dadosTitular?.cpf ?? "");
                        return (
                          <tr key={p.id} className="border-b hover:bg-muted/30">
                            <td className="py-2.5 pr-4">
                              <div className="font-medium">{nome}</div>
                              {cpf && <div className="text-xs text-muted-foreground font-mono">{cpf}</div>}
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground">{p.vendedorNome ?? "—"}</td>
                            <td className="py-2.5 pr-4">{fmt(p.valorTotal)}</td>
                            <td className="py-2.5 pr-2 text-muted-foreground text-xs">{fmtDate(p.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
