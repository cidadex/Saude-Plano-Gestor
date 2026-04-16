import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientesAtivos } from "@/data/clientes";
import { clientesCancelados } from "@/data/cancelados";
import { vendedores } from "@/data/vendedores";
import { comissoes } from "@/data/comissoes";
import { boletos } from "@/data/boletos";
import { formatMoney } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import { BarChart3, Users, TrendingDown, DollarSign, Award, AlertTriangle } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function AdminRelatorios() {
  /* ── Por Vendedor ─── */
  const porVendedor = useMemo(() => {
    return vendedores.map(v => {
      const ativos = clientesAtivos.filter(c =>
        c.representante.toUpperCase() === v.nome.toUpperCase() ||
        c.responsavel.toUpperCase() === v.nome.toUpperCase()
      );
      const titulares = ativos.filter(c => c.tipo === 'TITULAR').length;
      const dependentes = ativos.filter(c => c.tipo === 'DEPENDENTE').length;
      const receita = ativos.reduce((a, c) => a + c.valor, 0);
      const saldo = ativos.reduce((a, c) => a + c.saldo, 0);
      const comissaoPend = comissoes
        .filter(co => co.vendedor.toUpperCase() === v.nome.toUpperCase() && co.status === 'PENDENTE')
        .reduce((a, c) => a + c.valor, 0);
      return {
        nome: v.nome,
        ativos: ativos.length,
        titulares,
        dependentes,
        cancelados: v.totalCancelados,
        receita,
        saldo,
        comissaoPend,
        comissionado: v.comissionado,
      };
    }).sort((a, b) => b.receita - a.receita);
  }, []);

  const chartVendedor = porVendedor.map(v => ({
    name: v.nome,
    Ativos: v.ativos,
    Cancelados: v.cancelados,
  }));

  /* ── Por Plano ─── */
  const porPlano = useMemo(() => {
    const mapa: Record<string, { titulares: number; dependentes: number; receita: number }> = {};
    clientesAtivos.forEach(c => {
      if (!mapa[c.plano]) mapa[c.plano] = { titulares: 0, dependentes: 0, receita: 0 };
      if (c.tipo === 'TITULAR') mapa[c.plano].titulares++;
      else mapa[c.plano].dependentes++;
      mapa[c.plano].receita += c.valor;
    });
    const total = clientesAtivos.reduce((a, c) => a + c.valor, 0);
    return Object.entries(mapa).map(([plano, d]) => ({
      plano,
      ...d,
      total: d.titulares + d.dependentes,
      pct: total > 0 ? ((d.receita / total) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.receita - a.receita);
  }, []);

  const pieData = porPlano.map(p => ({ name: `Plano ${p.plano}`, value: p.total }));

  /* ── Cancelamentos ─── */
  const canceladosPorVendedor = useMemo(() => {
    const mapa: Record<string, number> = {};
    clientesCancelados.forEach(c => {
      const v = c.responsavel || 'Sem Resp.';
      mapa[v] = (mapa[v] || 0) + 1;
    });
    return Object.entries(mapa)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, []);

  const canceladosComDebito = clientesCancelados.filter(c => c.debitoTotal && c.debitoTotal > 0);
  const totalDebito = canceladosComDebito.reduce((a, c) => a + (c.debitoTotal || 0), 0);

  /* ── Inadimplência ─── */
  const boletosMes = boletos.filter(b => b.mesReferencia === '04/2026');
  const inadimplentes = boletosMes.filter(b => b.status === 'VENCIDO');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground">Análises detalhadas de carteira, planos e cancelamentos.</p>
      </div>

      <Tabs defaultValue="vendedor">
        <TabsList className="mb-4 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="vendedor" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Por Vendedor
          </TabsTrigger>
          <TabsTrigger value="plano" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Por Plano
          </TabsTrigger>
          <TabsTrigger value="cancelamentos" className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" /> Cancelamentos
          </TabsTrigger>
          <TabsTrigger value="inadimplencia" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Inadimplência
          </TabsTrigger>
        </TabsList>

        {/* ── Por Vendedor ─────────────────────────── */}
        <TabsContent value="vendedor" className="space-y-4">
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base">Performance por Vendedor — Abril 2026</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartVendedor} margin={{ top: 0, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Ativos" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Cancelados" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Titulares</TableHead>
                  <TableHead className="text-center">Dependentes</TableHead>
                  <TableHead className="text-center">Total Ativos</TableHead>
                  <TableHead className="text-center">Cancelados</TableHead>
                  <TableHead className="text-right">Receita Mensal</TableHead>
                  <TableHead className="text-right">Saldo Corretora</TableHead>
                  <TableHead className="text-right">Comiss. Pend.</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porVendedor.map((v, i) => (
                  <TableRow key={v.nome} className={i === 0 ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {i === 0 && <Award className="h-4 w-4 text-amber-500" />}
                        <span className="font-semibold">{v.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{v.titulares}</TableCell>
                    <TableCell className="text-center">{v.dependentes}</TableCell>
                    <TableCell className="text-center font-semibold">{v.ativos}</TableCell>
                    <TableCell className="text-center text-red-600">{v.cancelados}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatMoney(v.receita)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatMoney(v.saldo)}</TableCell>
                    <TableCell className="text-right text-amber-600">{v.comissaoPend > 0 ? formatMoney(v.comissaoPend) : '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={v.comissionado ? 'text-xs border-emerald-300 text-emerald-700 bg-emerald-50' : 'text-xs text-muted-foreground'}>
                        {v.comissionado ? 'Comiss.' : 'Parceiro'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-bold border-t-2">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-center">{porVendedor.reduce((a, v) => a + v.titulares, 0)}</TableCell>
                  <TableCell className="text-center">{porVendedor.reduce((a, v) => a + v.dependentes, 0)}</TableCell>
                  <TableCell className="text-center">{porVendedor.reduce((a, v) => a + v.ativos, 0)}</TableCell>
                  <TableCell className="text-center text-red-600">{porVendedor.reduce((a, v) => a + v.cancelados, 0)}</TableCell>
                  <TableCell className="text-right text-primary">{formatMoney(porVendedor.reduce((a, v) => a + v.receita, 0))}</TableCell>
                  <TableCell className="text-right text-emerald-600">{formatMoney(porVendedor.reduce((a, v) => a + v.saldo, 0))}</TableCell>
                  <TableCell className="text-right text-amber-600">{formatMoney(porVendedor.reduce((a, v) => a + v.comissaoPend, 0))}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Por Plano ─────────────────────────────── */}
        <TabsContent value="plano" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base">Distribuição por Plano</CardTitle>
              </CardHeader>
              <CardContent className="h-[260px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-center">Titulares</TableHead>
                    <TableHead className="text-center">Dependentes</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">% Carteira</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porPlano.map(p => (
                    <TableRow key={p.plano}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs bg-primary/5 border-primary/20 text-primary">
                          {p.plano}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{p.titulares}</TableCell>
                      <TableCell className="text-center">{p.dependentes}</TableCell>
                      <TableCell className="text-center font-semibold">{p.total}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(p.receita)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 rounded-full bg-primary/20 w-16">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${p.pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{p.pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>

        {/* ── Cancelamentos ─────────────────────────── */}
        <TabsContent value="cancelamentos" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-red-400">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Cancelados</p>
                <p className="text-3xl font-bold text-red-600">{clientesCancelados.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-400">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Com Débito</p>
                <p className="text-3xl font-bold text-amber-600">{canceladosComDebito.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-600">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total em Débito</p>
                <p className="text-2xl font-bold text-red-700">{formatMoney(totalDebito)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base">Cancelamentos por Responsável</CardTitle>
              </CardHeader>
              <CardContent className="h-[240px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={canceladosPorVendedor} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="nome" fontSize={11} width={60} />
                    <RechartsTooltip />
                    <Bar dataKey="total" fill="#ef4444" radius={[0, 2, 2, 0]} name="Cancelados" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base">Cancelados com Débito</CardTitle>
              </CardHeader>
              <div className="max-h-[240px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Cliente</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="text-right">Débito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {canceladosComDebito.slice(0, 15).map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">
                          <div className="font-medium truncate max-w-[140px]">{c.nome}</div>
                          <div className="text-xs text-muted-foreground font-mono">{c.cpf}</div>
                        </TableCell>
                        <TableCell className="text-sm">{c.responsavel}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600 text-sm">{formatMoney(c.debitoTotal || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ── Inadimplência ─────────────────────────── */}
        <TabsContent value="inadimplencia" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pagos em Dia</p>
                <p className="text-3xl font-bold text-emerald-600">{boletosMes.filter(b => b.status === 'PAGO').length}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatMoney(boletosMes.filter(b => b.status === 'PAGO').reduce((a, b) => a + b.valor, 0))}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Inadimplentes</p>
                <p className="text-3xl font-bold text-red-600">{inadimplentes.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatMoney(inadimplentes.reduce((a, b) => a + b.valor, 0))}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-400">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">% Inadimplência</p>
                <p className="text-3xl font-bold text-amber-600">
                  {boletosMes.length > 0 ? ((inadimplentes.length / boletosMes.length) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Referência Abr/2026</p>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Boletos Vencidos — Abril 2026
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-center">Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inadimplentes.map(b => (
                  <TableRow key={b.id} className="bg-red-50/30 dark:bg-red-950/10">
                    <TableCell>
                      <div className="font-medium text-sm">{b.clienteNome}</div>
                      <div className="text-xs text-muted-foreground font-mono">{b.clienteCpf}</div>
                    </TableCell>
                    <TableCell className="text-sm">{b.vendedor}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{b.plano}</Badge></TableCell>
                    <TableCell className="text-center text-sm">{b.vencimento}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{formatMoney(b.valor)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs border-red-300 bg-red-50 text-red-700">VENCIDO</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {inadimplentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum boleto vencido neste mês.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
