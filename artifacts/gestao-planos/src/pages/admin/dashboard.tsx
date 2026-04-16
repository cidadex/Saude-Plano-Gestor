import { Link } from "wouter";
import { clientesAtivos } from "@/data/clientes";
import { clientesCancelados } from "@/data/cancelados";
import { comissoes } from "@/data/comissoes";
import { boletos } from "@/data/boletos";
import { vendedores } from "@/data/vendedores";
import { formatMoney } from "@/lib/format";
import {
  Users, UserX, DollarSign, Wallet, TrendingUp, CheckCircle2,
  AlertCircle, Clock, CalendarDays, UserCheck, ArrowRight,
  BadgeDollarSign, BarChart3, Banknote,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
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
  '09/2025': 'Set', '10/2025': 'Out', '11/2025': 'Nov',
  '12/2025': 'Dez', '01/2026': 'Jan', '02/2026': 'Fev',
  '03/2026': 'Mar', '04/2026': 'Abr',
};

export default function AdminDashboard() {
  const totalAtivos = clientesAtivos.length;
  const totalTitulares = clientesAtivos.filter(c => c.tipo === 'TITULAR').length;
  const totalDependentes = clientesAtivos.filter(c => c.tipo === 'DEPENDENTE').length;
  const totalCancelados = clientesCancelados.length;

  const receitaMensal = clientesAtivos.reduce((acc, c) => acc + c.valor, 0);
  const saldoTotal = clientesAtivos.reduce((acc, c) => acc + c.saldo, 0);

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

  const pctAdimplente = boletosMes.length > 0
    ? Math.round((pgEmDia.length / boletosMes.length) * 100)
    : 0;

  const ativacoesData = Object.entries(mesesLabels).map(([mes, label]) => {
    const [m, y] = mes.split('/');
    const count = clientesAtivos.filter(c => {
      const d = parseDataBR(c.dataAtivacao);
      return d && d.getMonth() === Number(m) - 1 && d.getFullYear() === Number(y);
    }).length;
    const canceladosMes = clientesCancelados.filter(c => {
      if (!c.dataCancelamento) return false;
      const [cm, cy] = c.dataCancelamento.split('/');
      return cm === m && cy === y;
    }).length;
    return { name: label, Ativações: count, Cancelamentos: canceladosMes };
  });

  const pagamentosData = [
    { name: 'Pagos', valor: totalPgEmDia, qtd: pgEmDia.length, cor: '#10b981' },
    { name: 'A Vencer', valor: totalAVencer, qtd: pgAVencer.length, cor: '#f59e0b' },
    { name: 'Vencidos', valor: totalPgEmAtraso, qtd: pgEmAtraso.length, cor: '#ef4444' },
  ];

  const topVendedores = vendedores
    .map(v => {
      const receita = clientesAtivos
        .filter(c => c.representante.toUpperCase() === v.nome.toUpperCase() || c.responsavel.toUpperCase() === v.nome.toUpperCase())
        .reduce((a, c) => a + c.valor, 0);
      return { nome: v.nome, ativos: v.totalAtivos, receita };
    })
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 5);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Visão geral da corretora — Abril 2026</p>
        </div>
        <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 font-semibold">
          {pctAdimplente}% adimplente
        </span>
      </div>

      {/* ── LINHA 1: KPIs Carteira ───────────────────── */}
      <section className="space-y-2.5">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em]">Carteira de Beneficiários</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Total Ativos */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg shadow-blue-900/20">
            <div className="absolute right-3 top-3 opacity-20">
              <Users className="h-16 w-16" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Total Ativos</p>
            <p className="mt-2 text-5xl font-extrabold" data-testid="metric-ativos">{totalAtivos}</p>
            <p className="mt-1.5 text-sm text-blue-200">beneficiários na carteira</p>
            <div className="mt-3 flex gap-3 text-xs text-blue-300 border-t border-blue-500/50 pt-3">
              <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{totalTitulares} titulares</span>
              <span>·</span>
              <span>{totalDependentes} depend.</span>
            </div>
          </div>

          {/* Receita Mensal */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/20">
            <div className="absolute right-3 top-3 opacity-20">
              <DollarSign className="h-16 w-16" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Receita Mensal</p>
            <p className="mt-2 text-3xl font-extrabold leading-tight" data-testid="metric-receita">{formatMoney(receitaMensal)}</p>
            <p className="mt-1.5 text-sm text-emerald-200">soma dos contratos ativos</p>
            <div className="mt-3 flex gap-3 text-xs text-emerald-300 border-t border-emerald-500/50 pt-3">
              <span>Saldo corretora: <span className="font-bold text-white">{formatMoney(saldoTotal)}</span></span>
            </div>
          </div>

          {/* Cancelados */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-rose-600 p-5 text-white shadow-lg shadow-red-900/20">
            <div className="absolute right-3 top-3 opacity-20">
              <UserX className="h-16 w-16" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-200">Cancelados</p>
            <p className="mt-2 text-5xl font-extrabold" data-testid="metric-cancelados">{totalCancelados}</p>
            <p className="mt-1.5 text-sm text-red-200">histórico de cancelamentos</p>
            <div className="mt-3 flex gap-3 text-xs text-red-300 border-t border-red-500/50 pt-3">
              <span>{clientesCancelados.filter(c => c.debitoTotal && c.debitoTotal > 0).length} com débito pendente</span>
            </div>
          </div>

          {/* Comissões */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-amber-900/20">
            <div className="absolute right-3 top-3 opacity-20">
              <Wallet className="h-16 w-16" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Comissões a Pagar</p>
            <p className="mt-2 text-3xl font-extrabold leading-tight" data-testid="metric-comissoes">{formatMoney(comissoesAbertas)}</p>
            <p className="mt-1.5 text-sm text-amber-200">pendentes de repasse</p>
            <div className="mt-3 text-xs text-amber-300 border-t border-amber-500/50 pt-3">
              <Link href="/admin/comissoes" className="flex items-center gap-1 hover:text-white transition-colors">
                Ver extrato <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── LINHA 2: Pagamentos Abril ─────────────────── */}
      <section className="space-y-2.5">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em]">Pagamentos — Abril 2026</p>
        <div className="grid gap-4 sm:grid-cols-3">

          <div className="rounded-xl border bg-card p-5 flex gap-4 items-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Pagos em Dia</p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{formatMoney(totalPgEmDia)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{pgEmDia.length} boleto{pgEmDia.length !== 1 ? 's' : ''} confirmados</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 flex gap-4 items-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Em Atraso</p>
              <p className="text-2xl font-bold text-red-600 mt-0.5">{formatMoney(totalPgEmAtraso)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{pgEmAtraso.length} boleto{pgEmAtraso.length !== 1 ? 's' : ''} vencido{pgEmAtraso.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 flex gap-4 items-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">A Vencer</p>
              <p className="text-2xl font-bold text-amber-600 mt-0.5">{formatMoney(totalAVencer)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{pgAVencer.length} boleto{pgAVencer.length !== 1 ? 's' : ''} pendente{pgAVencer.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── LINHA 3: Novas Ativações ─────────────────── */}
      <section className="space-y-2.5">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em]">Novas Ativações</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Hoje', value: vendasHoje, sub: '16/04/2026', icon: CalendarDays, color: 'violet' },
            { label: 'Esta Semana', value: vendasSemana, sub: '10/04 — 16/04', icon: TrendingUp, color: 'violet' },
            { label: 'Abril 2026', value: vendasMes, sub: 'ativações no mês', icon: BadgeDollarSign, color: 'violet' },
          ].map(item => (
            <div key={item.label} className="rounded-xl border bg-card p-5 flex gap-4 items-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <item.icon className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{item.label}</p>
                <p className="text-4xl font-extrabold text-foreground mt-0.5">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LINHA 4: Gráficos ─────────────────────────── */}
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Gráfico ativações */}
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm overflow-hidden" data-testid="chart-ativacoes">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Ativações × Cancelamentos por Mês</span>
          </div>
          <div className="p-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ativacoesData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis fontSize={11} tick={{ fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <RechartsTooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="Ativações" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Cancelamentos" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Vendedores */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden" data-testid="chart-vendedores">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Top Vendedores</span>
          </div>
          <div className="p-4 space-y-3">
            {topVendedores.map((v, i) => {
              const max = topVendedores[0]?.receita || 1;
              const pct = Math.round((v.receita / max) * 100);
              return (
                <div key={v.nome} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                        i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'
                      }`}>{i + 1}</span>
                      <span className="font-medium text-xs truncate max-w-[100px]">{v.nome}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{formatMoney(v.receita)}</p>
                      <p className="text-[10px] text-muted-foreground">{v.ativos} ativos</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i === 0 ? 'bg-primary' : 'bg-primary/40'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LINHA 5: Distribuição de Pagamentos ─────── */}
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Distribuição de Cobrança — Abril 2026</span>
          </div>
          <div className="p-4 flex gap-4 items-center">
            <div className="flex-1 space-y-3">
              {pagamentosData.map(p => (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs font-medium">{p.name}</span>
                    <span className="font-bold text-sm">{formatMoney(p.valor)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(p.valor / receitaMensal) * 100}%`,
                          background: p.cor,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-12 text-right">{p.qtd} bol.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Atalhos rápidos */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <span className="font-semibold text-sm">Acesso Rápido</span>
          </div>
          <div className="p-3 space-y-1.5">
            {[
              { href: '/admin/clientes', label: 'Clientes Ativos', sub: `${totalAtivos} beneficiários`, icon: Users, color: 'text-blue-600 bg-blue-50' },
              { href: '/admin/financeiro', label: 'Financeiro', sub: 'Boletos e cobranças', icon: Banknote, color: 'text-emerald-600 bg-emerald-50' },
              { href: '/admin/comissoes', label: 'Comissões', sub: formatMoney(comissoesAbertas) + ' a pagar', icon: BadgeDollarSign, color: 'text-amber-600 bg-amber-50' },
              { href: '/admin/relatorios', label: 'Relatórios', sub: 'Análises por vendedor', icon: BarChart3, color: 'text-violet-600 bg-violet-50' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-none">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.sub}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
