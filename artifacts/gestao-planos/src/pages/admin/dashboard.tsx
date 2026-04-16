import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clientesAtivos } from "@/data/clientes";
import { clientesCancelados } from "@/data/cancelados";
import { comissoes } from "@/data/comissoes";
import { boletos } from "@/data/boletos";
import { vendedores } from "@/data/vendedores";
import { formatMoney } from "@/lib/format";
import {
  Users, UserMinus, DollarSign, Wallet, TrendingUp,
  CheckCircle2, AlertCircle, Clock, CalendarDays, UserCheck, UserX,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend,
} from "recharts";

function parseDataBR(data: string): Date | null {
  const parts = data.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(dt.getTime()) ? null : dt;
}

const HOJE = new Date(2026, 3, 16);
const INICIO_SEMANA = new Date(2026, 3, 10);
const MES_ATUAL_NUM = 3;
const ANO_ATUAL = 2026;

const mesesLabels: Record<string, string> = {
  '09/2025': 'Set 25', '10/2025': 'Out 25', '11/2025': 'Nov 25',
  '12/2025': 'Dez 25', '01/2026': 'Jan 26', '02/2026': 'Fev 26',
  '03/2026': 'Mar 26', '04/2026': 'Abr 26',
};

export default function AdminDashboard() {
  const totalAtivos = clientesAtivos.length;
  const totalTitulares = clientesAtivos.filter(c => c.tipo === 'TITULAR').length;
  const totalDependentes = clientesAtivos.filter(c => c.tipo === 'DEPENDENTE').length;
  const totalCancelados = clientesCancelados.length;

  const receitaMensal = clientesAtivos.reduce((acc, c) => acc + c.valor, 0);

  const boletosMes = boletos.filter(b => b.mesReferencia === '04/2026');
  const pgEmDia = boletosMes.filter(b => b.status === 'PAGO');
  const pgEmAtraso = boletosMes.filter(b => b.status === 'VENCIDO');
  const pgAVencer = boletosMes.filter(b => b.status === 'PENDENTE');
  const totalPgEmDia = pgEmDia.reduce((acc, b) => acc + b.valor, 0);
  const totalPgEmAtraso = pgEmAtraso.reduce((acc, b) => acc + b.valor, 0);
  const totalAVencer = pgAVencer.reduce((acc, b) => acc + b.valor, 0);

  const vendasHoje = clientesAtivos.filter(c => {
    const d = parseDataBR(c.dataAtivacao);
    return d && d.toDateString() === HOJE.toDateString();
  }).length;

  const vendasSemana = clientesAtivos.filter(c => {
    const d = parseDataBR(c.dataAtivacao);
    return d && d >= INICIO_SEMANA && d <= HOJE;
  }).length;

  const vendasMes = clientesAtivos.filter(c => {
    const d = parseDataBR(c.dataAtivacao);
    return d && d.getMonth() === MES_ATUAL_NUM && d.getFullYear() === ANO_ATUAL;
  }).length;

  const comissoesAbertas = comissoes
    .filter(c => c.status === 'PENDENTE')
    .reduce((acc, c) => acc + c.valor, 0);

  const ativacoesData = Object.entries(mesesLabels).map(([mes, label]) => {
    const [m, y] = mes.split('/');
    const count = clientesAtivos.filter(c => {
      const d = parseDataBR(c.dataAtivacao);
      return d && d.getMonth() === Number(m) - 1 && d.getFullYear() === Number(y);
    }).length;
    return { name: label, Ativações: count };
  });

  const vendedoresData = vendedores
    .map(v => ({ name: v.nome, Ativos: v.totalAtivos, Cancelados: v.totalCancelados }))
    .sort((a, b) => b.Ativos - a.Ativos)
    .slice(0, 8);

  const pctAdimplente = boletosMes.length > 0
    ? Math.round((pgEmDia.length / boletosMes.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Geral</h2>
        <p className="text-muted-foreground">Visão panorâmica da corretora — carteira, faturamento e vendas.</p>
      </div>

      {/* ── CARTEIRA ──────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Carteira de Beneficiários</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="metric-ativos" className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Ativos</CardTitle>
              <Users className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-foreground">{totalAtivos}</div>
              <p className="text-xs text-muted-foreground mt-1">Beneficiários na carteira</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Titulares</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-foreground">{totalTitulares}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalDependentes} dependente{totalDependentes !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="metric-cancelados" className="border-l-4 border-l-red-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cancelamentos</CardTitle>
              <UserX className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-red-600">{totalCancelados}</div>
              <p className="text-xs text-muted-foreground mt-1">Histórico total</p>
            </CardContent>
          </Card>

          <Card data-testid="metric-comissoes" className="border-l-4 border-l-amber-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comissões a Pagar</CardTitle>
              <Wallet className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-amber-600">{formatMoney(comissoesAbertas)}</div>
              <p className="text-xs text-muted-foreground mt-1">Pendentes de repasse</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── FATURAMENTO MÊS ATUAL ─────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Faturamento — Abril 2026</h3>
          <Badge variant="outline" className="text-xs">
            {pctAdimplente}% adimplente
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="metric-receita" className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-primary">{formatMoney(receitaMensal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Soma carteira ativa</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pagamentos em Dia</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-emerald-600">{formatMoney(totalPgEmDia)}</div>
              <p className="text-xs text-muted-foreground mt-1">{pgEmDia.length} boleto{pgEmDia.length !== 1 ? 's' : ''} pagos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pagamentos em Atraso</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-red-600">{formatMoney(totalPgEmAtraso)}</div>
              <p className="text-xs text-muted-foreground mt-1">{pgEmAtraso.length} boleto{pgEmAtraso.length !== 1 ? 's' : ''} vencido{pgEmAtraso.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">A Vencer</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-amber-600">{formatMoney(totalAVencer)}</div>
              <p className="text-xs text-muted-foreground mt-1">{pgAVencer.length} boleto{pgAVencer.length !== 1 ? 's' : ''} pendente{pgAVencer.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── NOVAS VENDAS ─────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Novas Ativações</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-l-4 border-l-violet-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
              <CalendarDays className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-foreground">{vendasHoje}</div>
              <p className="text-xs text-muted-foreground mt-1">Ativações em 16/04/2026</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-violet-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Esta Semana</CardTitle>
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-foreground">{vendasSemana}</div>
              <p className="text-xs text-muted-foreground mt-1">10/04 a 16/04/2026</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-violet-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Este Mês</CardTitle>
              <UserMinus className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-foreground">{vendasMes}</div>
              <p className="text-xs text-muted-foreground mt-1">Ativações em Abril 2026</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── GRÁFICOS ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="chart-ativacoes">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-base">Ativações por Mês</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ativacoesData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <RechartsTooltip />
                <Bar dataKey="Ativações" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="chart-vendedores">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-base">Ativos vs Cancelados por Vendedor</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendedoresData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="Ativos" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Cancelados" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
