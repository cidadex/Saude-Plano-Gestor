import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { boletos } from "@/data/boletos";
import { clientesAtivos } from "@/data/clientes";
import { vendedores } from "@/data/vendedores";
import { formatMoney, getStatusBadgeVariant } from "@/lib/format";
import {
  CheckCircle2, AlertCircle, Clock, DollarSign, Banknote,
  SlidersHorizontal, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Cell,
} from "recharts";
import { WhatsappModal } from "@/components/whatsapp-modal";
import type { Boleto } from "@/data/types";

const MES_ATUAL = '04/2026';
const MES_LABEL: Record<string, string> = {
  '04/2026': 'Abril 2026',
  '03/2026': 'Março 2026',
};

export default function AdminFinanceiro() {
  const [mesFilter, setMesFilter] = useState(MES_ATUAL);
  const [vendedorFilter, setVendedorFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [whatsappAberto, setWhatsappAberto] = useState(false);
  const [boletoSel, setBoletoSel] = useState<Boleto | null>(null);

  const meses = Array.from(new Set(boletos.map(b => b.mesReferencia)));
  const listaVendedores = Array.from(new Set(boletos.map(b => b.vendedor)));

  const boletosFiltrados = useMemo(() =>
    boletos.filter(b => {
      const matchMes = b.mesReferencia === mesFilter;
      const matchVendedor = vendedorFilter === 'TODOS' || b.vendedor === vendedorFilter;
      const matchStatus = statusFilter === 'TODOS' || b.status === statusFilter;
      return matchMes && matchVendedor && matchStatus;
    }), [mesFilter, vendedorFilter, statusFilter]);

  const boletosMes = boletos.filter(b => b.mesReferencia === mesFilter);
  const totalReceita = clientesAtivos.reduce((a, c) => a + c.valor, 0);
  const totalPago = boletosMes.filter(b => b.status === 'PAGO').reduce((a, b) => a + b.valor, 0);
  const totalAtraso = boletosMes.filter(b => b.status === 'VENCIDO').reduce((a, b) => a + b.valor, 0);
  const totalPendente = boletosMes.filter(b => b.status === 'PENDENTE').reduce((a, b) => a + b.valor, 0);
  const qtdPago = boletosMes.filter(b => b.status === 'PAGO').length;
  const qtdAtraso = boletosMes.filter(b => b.status === 'VENCIDO').length;
  const qtdPendente = boletosMes.filter(b => b.status === 'PENDENTE').length;
  const pct = boletosMes.length > 0 ? Math.round((qtdPago / boletosMes.length) * 100) : 0;

  /* Distribuição por vendedor */
  const porVendedorData = listaVendedores.map(v => {
    const bv = boletosMes.filter(b => b.vendedor === v);
    return {
      name: v,
      Pago: bv.filter(b => b.status === 'PAGO').reduce((a, b) => a + b.valor, 0),
      Pendente: bv.filter(b => b.status === 'PENDENTE').reduce((a, b) => a + b.valor, 0),
      Vencido: bv.filter(b => b.status === 'VENCIDO').reduce((a, b) => a + b.valor, 0),
    };
  }).filter(v => v.Pago + v.Pendente + v.Vencido > 0).sort((a, b) => (b.Pago + b.Pendente + b.Vencido) - (a.Pago + a.Pendente + a.Vencido));

  const getTelefone = (cpf: string) =>
    clientesAtivos.find(c => c.cpf === cpf)?.telefone ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <p className="text-muted-foreground">Controle de boletos, pagamentos e inadimplência por período.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Receita Carteira</p>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{formatMoney(totalReceita)}</p>
            <p className="text-xs text-muted-foreground mt-1">Soma contratos ativos</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pagos</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatMoney(totalPago)}</p>
            <p className="text-xs text-muted-foreground mt-1">{qtdPago} boleto{qtdPago !== 1 ? 's' : ''} · {pct}% adimplente</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Em Atraso</p>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{formatMoney(totalAtraso)}</p>
            <p className="text-xs text-muted-foreground mt-1">{qtdAtraso} vencido{qtdAtraso !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">A Vencer</p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatMoney(totalPendente)}</p>
            <p className="text-xs text-muted-foreground mt-1">{qtdPendente} pendente{qtdPendente !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico por vendedor */}
      {porVendedorData.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Cobrança por Vendedor — {MES_LABEL[mesFilter] || mesFilter}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porVendedorData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <RechartsTooltip formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="Pago" stackId="a" fill="#10b981" />
                <Bar dataKey="Pendente" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Vencido" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filtros + Tabela */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Boletos Detalhados
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={mesFilter} onValueChange={setMesFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(m => <SelectItem key={m} value={m}>{MES_LABEL[m] || m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {listaVendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Cliente / CPF</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="text-center">Vencimento</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boletosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum boleto encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : boletosFiltrados.map(b => (
              <TableRow key={b.id} className={b.status === 'VENCIDO' ? 'bg-red-50/30 dark:bg-red-950/10' : b.status === 'PAGO' ? 'bg-emerald-50/20' : ''}>
                <TableCell>
                  <div className="font-medium text-sm">{b.clienteNome}</div>
                  <div className="text-xs text-muted-foreground font-mono">{b.clienteCpf}</div>
                </TableCell>
                <TableCell className="text-sm">{b.vendedor}</TableCell>
                <TableCell><Badge variant="outline" className="font-mono text-xs">{b.plano}</Badge></TableCell>
                <TableCell className="text-center text-sm">{b.vencimento}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.mesReferencia}</TableCell>
                <TableCell className="text-right font-semibold">{formatMoney(b.valor)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-xs ${getStatusBadgeVariant(b.status)}`}>
                    {b.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {b.status !== 'PAGO' && getTelefone(b.clienteCpf) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => { setBoletoSel(b); setWhatsappAberto(true); }}
                    >
                      WhatsApp
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {boletosFiltrados.length > 0 && (
              <TableRow className="bg-muted/30 font-bold border-t-2">
                <TableCell colSpan={5}>TOTAL ({boletosFiltrados.length} boletos)</TableCell>
                <TableCell className="text-right">{formatMoney(boletosFiltrados.reduce((a, b) => a + b.valor, 0))}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {boletoSel && (
        <WhatsappModal
          open={whatsappAberto}
          onClose={() => { setWhatsappAberto(false); setBoletoSel(null); }}
          clienteNome={boletoSel.clienteNome}
          telefone={getTelefone(boletoSel.clienteCpf)}
          valor={boletoSel.valor}
          mesReferencia={boletoSel.mesReferencia}
          vencimento={boletoSel.vencimento}
        />
      )}
    </div>
  );
}
