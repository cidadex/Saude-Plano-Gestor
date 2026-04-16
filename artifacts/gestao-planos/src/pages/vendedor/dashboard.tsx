import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { vendedorAtual } from "@/data/vendedores";
import { getPropostasByVendedor } from "@/data/propostas";
import { getTotalComissoesVendedor, getComissoesByVendedor } from "@/data/comissoes";
import { getBoletosByVendedor } from "@/data/boletos";
import { getClientesByVendedor } from "@/data/clientes";
import { formatMoney, getStatusBadgeVariant } from "@/lib/format";
import { Link } from "wouter";
import {
  FileText, DollarSign, Receipt, ArrowRight, Users,
  CheckCircle2, AlertCircle, Clock, UserCheck, TrendingUp,
  CalendarDays, BadgeDollarSign, Wallet, MessageCircle,
} from "lucide-react";

function parseDataBR(data: string): Date | null {
  const parts = data.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(dt.getTime()) ? null : dt;
}

const HOJE = new Date(2026, 3, 16);
const INICIO_SEMANA = new Date(2026, 3, 10);

export default function VendedorDashboard() {
  const propostas = getPropostasByVendedor(vendedorAtual.nome);
  const meusBoletos = getBoletosByVendedor(vendedorAtual.nome);
  const meusClientes = getClientesByVendedor(vendedorAtual.nome);
  const comissoes = getTotalComissoesVendedor(vendedorAtual.nome);
  const minhasComissoes = getComissoesByVendedor(vendedorAtual.nome);

  const totalTitulares = meusClientes.filter(c => c.tipo === 'TITULAR').length;
  const totalDependentes = meusClientes.filter(c => c.tipo === 'DEPENDENTE').length;

  const boletosMes = meusBoletos.filter(b => b.mesReferencia === '04/2026');
  const pgEmDia = boletosMes.filter(b => b.status === 'PAGO');
  const pgEmAtraso = boletosMes.filter(b => b.status === 'VENCIDO');
  const pgAVencer = boletosMes.filter(b => b.status === 'PENDENTE');
  const totalPgEmDia = pgEmDia.reduce((acc, b) => acc + b.valor, 0);
  const totalPgEmAtraso = pgEmAtraso.reduce((acc, b) => acc + b.valor, 0);
  const totalAVencer = pgAVencer.reduce((acc, b) => acc + b.valor, 0);

  const vendasHoje = meusClientes.filter(c => {
    const d = parseDataBR(c.dataAtivacao);
    return d && d.toDateString() === HOJE.toDateString();
  }).length;

  const vendasSemana = meusClientes.filter(c => {
    const d = parseDataBR(c.dataAtivacao);
    return d && d >= INICIO_SEMANA && d <= HOJE;
  }).length;

  const vendasMes = meusClientes.filter(c => {
    const d = parseDataBR(c.dataAtivacao);
    return d && d.getMonth() === 3 && d.getFullYear() === 2026;
  }).length;

  const receitaCarteira = meusClientes.reduce((acc, c) => acc + c.valor, 0);
  const saldoCarteira = meusClientes.reduce((acc, c) => acc + c.saldo, 0);
  const comissaoPendente = minhasComissoes.filter(c => c.status === 'PENDENTE').reduce((a, c) => a + c.valor, 0);

  const propostasRecentes = propostas.slice(0, 5);
  const pctAdimplente = boletosMes.length > 0 ? Math.round((pgEmDia.length / boletosMes.length) * 100) : 0;

  const clientesCobranca = meusClientes
    .filter(c => boletosMes.some(b => b.clienteCpf === c.cpf && b.status === 'VENCIDO'))
    .slice(0, 4);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Olá, {vendedorAtual.nome.split(' ')[0]} 👋</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Seu painel de resultados — Abril 2026</p>
        </div>
        <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 font-semibold">
          {pctAdimplente}% adimplente
        </span>
      </div>

      {/* ── KPIs Minha Carteira ────────────────── */}
      <section className="space-y-2.5">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em]">Minha Carteira</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/20">
            <div className="absolute right-3 top-3 opacity-20"><Users className="h-16 w-16" /></div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Minha Carteira</p>
            <p className="mt-2 text-5xl font-extrabold" data-testid="metric-ativos-vendedor">{meusClientes.length}</p>
            <p className="mt-1.5 text-sm text-emerald-200">beneficiários ativos</p>
            <div className="mt-3 flex gap-3 text-xs text-emerald-300 border-t border-emerald-500/50 pt-3">
              <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{totalTitulares} titular{totalTitulares !== 1 ? 'es' : ''}</span>
              <span>·</span>
              <span>{totalDependentes} depend.</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-900/20">
            <div className="absolute right-3 top-3 opacity-20"><DollarSign className="h-16 w-16" /></div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Receita da Carteira</p>
            <p className="mt-2 text-3xl font-extrabold leading-tight" data-testid="metric-receita-vendedor">{formatMoney(receitaCarteira)}</p>
            <p className="mt-1.5 text-sm text-blue-200">faturamento mensal</p>
            <div className="mt-3 text-xs text-blue-300 border-t border-blue-500/50 pt-3">
              Saldo corretora: <span className="font-bold text-white">{formatMoney(saldoCarteira)}</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-amber-900/20">
            <div className="absolute right-3 top-3 opacity-20"><Receipt className="h-16 w-16" /></div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Comissão a Receber</p>
            <p className="mt-2 text-3xl font-extrabold leading-tight" data-testid="metric-comissoes-vendedor">{formatMoney(comissaoPendente)}</p>
            <p className="mt-1.5 text-sm text-amber-200">pendente de repasse</p>
            <div className="mt-3 text-xs text-amber-300 border-t border-amber-500/50 pt-3">
              Total histórico: <span className="font-bold text-white">{formatMoney(vendedorAtual.comissaoTotal)}</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-violet-900/20">
            <div className="absolute right-3 top-3 opacity-20"><TrendingUp className="h-16 w-16" /></div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-200">Ativações Abril</p>
            <p className="mt-2 text-5xl font-extrabold">{vendasMes}</p>
            <p className="mt-1.5 text-sm text-violet-200">novos clientes este mês</p>
            <div className="mt-3 flex gap-3 text-xs text-violet-300 border-t border-violet-500/50 pt-3">
              <span>Semana: {vendasSemana}</span>
              <span>·</span>
              <span>Hoje: {vendasHoje}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pagamentos ─────────────────────────────── */}
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
              <p className="text-xs text-muted-foreground">{pgEmDia.length} boleto{pgEmDia.length !== 1 ? 's' : ''} confirmados</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex gap-4 items-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Em Atraso</p>
              <p className="text-2xl font-bold text-red-600 mt-0.5">{formatMoney(totalPgEmAtraso)}</p>
              <p className="text-xs text-muted-foreground">{pgEmAtraso.length} boleto{pgEmAtraso.length !== 1 ? 's' : ''} vencido{pgEmAtraso.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex gap-4 items-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">A Vencer</p>
              <p className="text-2xl font-bold text-amber-600 mt-0.5">{formatMoney(totalAVencer)}</p>
              <p className="text-xs text-muted-foreground">{pgAVencer.length} boleto{pgAVencer.length !== 1 ? 's' : ''} pendente{pgAVencer.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Propostas + Cobrança ───────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Propostas recentes */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Propostas Recentes</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/vendedor/propostas" className="flex items-center gap-1 text-xs">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">Plano</TableHead>
                <TableHead className="text-right text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {propostasRecentes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">
                    Nenhuma proposta encontrada.
                  </TableCell>
                </TableRow>
              ) : propostasRecentes.map(prop => (
                <TableRow key={prop.id}>
                  <TableCell>
                    <div className="font-medium text-sm truncate max-w-[140px]">{prop.clienteNome}</div>
                    <div className="text-xs text-muted-foreground">{prop.dataEnvio}</div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{prop.plano}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={`text-xs ${getStatusBadgeVariant(prop.status)}`}>
                      {prop.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Comissões + atalhos */}
        <div className="space-y-4">
          {/* Resumo comissões */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-sm">Comissões</span>
              </div>
              <Link href="/vendedor/comissoes" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver extrato <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Agenciamento (Venda)</span>
                <span className="font-semibold text-blue-600">{formatMoney(comissoes.venda)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Serviço (Vitalícia/mês)</span>
                <span className="font-semibold text-violet-600">{formatMoney(comissoes.servico)}</span>
              </div>
              <div className="pt-3 border-t flex items-center justify-between font-bold">
                <span className="text-sm">Total Acumulado</span>
                <span className="text-lg text-amber-600">{formatMoney(vendedorAtual.comissaoTotal)}</span>
              </div>
            </div>
          </div>

          {/* Atalhos */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b">
              <span className="font-semibold text-sm">Acesso Rápido</span>
            </div>
            <div className="p-2 space-y-1">
              {[
                { href: '/vendedor/carteira', label: 'Minha Carteira', sub: `${meusClientes.length} clientes ativos`, icon: Users, color: 'text-emerald-600 bg-emerald-50' },
                { href: '/vendedor/boletos', label: 'Boletos', sub: `${pgAVencer.length} pendentes neste mês`, icon: Receipt, color: 'text-blue-600 bg-blue-50' },
                { href: '/vendedor/cobranca', label: 'Cobrança', sub: `${pgEmAtraso.length} inadimplente${pgEmAtraso.length !== 1 ? 's' : ''}`, icon: MessageCircle, color: 'text-red-600 bg-red-50' },
                { href: '/vendedor/propostas', label: 'Propostas', sub: `${propostas.length} proposta${propostas.length !== 1 ? 's' : ''}`, icon: FileText, color: 'text-violet-600 bg-violet-50' },
              ].map(item => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors group">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
