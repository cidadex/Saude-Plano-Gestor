import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { comissoes } from "@/data/comissoes";
import { vendedores } from "@/data/vendedores";
import { formatMoney } from "@/lib/format";
import { DollarSign, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

export default function AdminComissoes() {
  const [vendedorFilter, setVendedorFilter] = useState('TODOS');
  const [tipoFilter, setTipoFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  const listaVendedores = Array.from(new Set(comissoes.map(c => c.vendedor)));

  const comissoesFiltradas = useMemo(() =>
    comissoes.filter(c => {
      const matchV = vendedorFilter === 'TODOS' || c.vendedor === vendedorFilter;
      const matchT = tipoFilter === 'TODOS' || c.tipo === tipoFilter;
      const matchS = statusFilter === 'TODOS' || c.status === statusFilter;
      return matchV && matchT && matchS;
    }), [vendedorFilter, tipoFilter, statusFilter]);

  const totalPago = comissoes.filter(c => c.status === 'PAGO').reduce((a, c) => a + c.valor, 0);
  const totalPendente = comissoes.filter(c => c.status === 'PENDENTE').reduce((a, c) => a + c.valor, 0);
  const totalVenda = comissoes.filter(c => c.tipo === 'VENDA').reduce((a, c) => a + c.valor, 0);
  const totalServico = comissoes.filter(c => c.tipo === 'SERVICO').reduce((a, c) => a + c.valor, 0);

  const porVendedor = vendedores.map(v => {
    const cv = comissoes.filter(c => c.vendedor.toUpperCase() === v.nome.toUpperCase());
    return {
      name: v.nome,
      Venda: cv.filter(c => c.tipo === 'VENDA').reduce((a, c) => a + c.valor, 0),
      Serviço: cv.filter(c => c.tipo === 'SERVICO').reduce((a, c) => a + c.valor, 0),
    };
  }).filter(v => v.Venda + v.Serviço > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight">Comissões</h2>
        <p className="text-muted-foreground">Controle de repasses e comissionamento da equipe de vendas.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pago</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatMoney(totalPago)}</p>
            <p className="text-xs text-muted-foreground mt-1">{comissoes.filter(c => c.status === 'PAGO').length} pagamentos realizados</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">A Pagar</p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatMoney(totalPendente)}</p>
            <p className="text-xs text-muted-foreground mt-1">{comissoes.filter(c => c.status === 'PENDENTE').length} pendentes de repasse</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Agenciamento (Venda)</p>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatMoney(totalVenda)}</p>
            <p className="text-xs text-muted-foreground mt-1">{comissoes.filter(c => c.tipo === 'VENDA').length} comissões de venda</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Serviço (Vitalícia)</p>
              <DollarSign className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-2xl font-bold text-violet-600">{formatMoney(totalServico)}</p>
            <p className="text-xs text-muted-foreground mt-1">{comissoes.filter(c => c.tipo === 'SERVICO').length} comissões mensais</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base">Comissões por Vendedor</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porVendedor} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <RechartsTooltip formatter={(v: number) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="Venda" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Serviço" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base">Extrato de Comissões</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Vendedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {listaVendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="VENDA">Agenciamento</SelectItem>
                  <SelectItem value="SERVICO">Serviço</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Vendedor</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Data Venda</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum resultado.</TableCell>
              </TableRow>
            ) : comissoesFiltradas.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-semibold text-sm">{c.vendedor}</TableCell>
                <TableCell className="text-sm">{c.clienteNome}</TableCell>
                <TableCell><Badge variant="outline" className="font-mono text-xs">{c.plano}</Badge></TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-xs ${c.tipo === 'VENDA' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-violet-300 bg-violet-50 text-violet-700'}`}>
                    {c.tipo === 'VENDA' ? 'Agenciamento' : 'Serviço'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.mesReferencia}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.dataVenda || '—'}</TableCell>
                <TableCell className="text-right font-semibold">{formatMoney(c.valor)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-xs ${c.status === 'PAGO' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                    {c.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {comissoesFiltradas.length > 0 && (
              <TableRow className="bg-muted/30 font-bold border-t-2">
                <TableCell colSpan={6}>TOTAL ({comissoesFiltradas.length} registros)</TableCell>
                <TableCell className="text-right">{formatMoney(comissoesFiltradas.reduce((a, c) => a + c.valor, 0))}</TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
