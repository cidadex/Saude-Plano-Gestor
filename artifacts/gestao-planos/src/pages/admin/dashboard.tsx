import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import {
  Users, UserX, DollarSign, Wallet, TrendingUp, CheckCircle2,
  AlertCircle, Clock, CalendarDays, UserCheck, ArrowRight,
  BadgeDollarSign, BarChart3, Banknote, Loader2,
} from "lucide-react";

type AdminCliente = {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  vendedorId: string;
  vendedorNome?: string | null;
  valorMensal?: string | null;
  saldo?: string | null;
  dataAtivacao?: string | null;
};

type AdminBoleto = {
  id: string;
  clienteId: string;
  clienteNome: string;
  valor: string;
  mesReferencia: string;
  status: string;
};

type AdminVendedor = {
  id: string;
  nome: string;
  totalClientes: number;
};

type AdminComissao = {
  id: string;
  vendedorId: string;
  vendedorNome: string | null;
  valor: string;
  status: "PENDENTE" | "PAGO";
};

type AdminDashboardData = {
  clientes: AdminCliente[];
  boletos: AdminBoleto[];
  vendedores: AdminVendedor[];
  comissoes: AdminComissao[];
};

function amount(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const [, day, month, year] = br;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthReference(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

const cardLinkClass = "block rounded-xl transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export default function AdminDashboard() {
  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async (): Promise<AdminDashboardData> => {
      const [clientesResult, boletosResult, vendedoresResult, comissoesResult] = await Promise.all([
        apiFetch<{ clientes: AdminCliente[] }>("/admin/clientes"),
        apiFetch<{ boletos: AdminBoleto[] }>("/admin/boletos"),
        apiFetch<{ vendedores: AdminVendedor[] }>("/admin/vendedores"),
        apiFetch<{ comissoes: AdminComissao[] }>("/admin/comissoes"),
      ]);
      return {
        clientes: clientesResult.clientes ?? [],
        boletos: boletosResult.boletos ?? [],
        vendedores: vendedoresResult.vendedores ?? [],
        comissoes: comissoesResult.comissoes ?? [],
      };
    },
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-admin-dashboard">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    const error = dashboardQuery.error;
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between pb-4 border-b">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground text-sm mt-0.5">Visão geral da corretora.</p>
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" data-testid="error-admin-dashboard">
          Não foi possível carregar os dados do dashboard. {error instanceof Error ? error.message : String(error)}
        </div>
      </div>
    );
  }

  const { clientes, boletos, vendedores, comissoes } = dashboardQuery.data;
  const hoje = new Date();
  const mesAtual = monthReference(hoje);
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  inicioSemana.setHours(0, 0, 0, 0);
  const ativos = clientes.filter(cliente => cliente.status === "ATIVO");
  const cancelados = clientes.filter(cliente => cliente.status === "CANCELADO");
  const totalAtivos = ativos.length;
  const totalTitulares = ativos.filter(cliente => cliente.tipo === "TITULAR").length;
  const totalDependentes = ativos.filter(cliente => cliente.tipo === "DEPENDENTE").length;
  const receitaMensal = ativos.reduce((total, cliente) => total + amount(cliente.valorMensal), 0);
  const saldoTotal = ativos.reduce((total, cliente) => total + amount(cliente.saldo), 0);

  const boletosMes = boletos.filter(boleto => boleto.mesReferencia === mesAtual);
  const pgEmDia = boletosMes.filter(boleto => boleto.status === "PAGO");
  const pgEmAtraso = boletosMes.filter(boleto => boleto.status === "VENCIDO");
  const pgAVencer = boletosMes.filter(boleto => boleto.status === "PENDENTE");
  const totalPgEmDia = pgEmDia.reduce((total, boleto) => total + amount(boleto.valor), 0);
  const totalPgEmAtraso = pgEmAtraso.reduce((total, boleto) => total + amount(boleto.valor), 0);
  const totalAVencer = pgAVencer.reduce((total, boleto) => total + amount(boleto.valor), 0);
  const vendasHoje = ativos.filter(cliente => {
    const date = parseDate(cliente.dataAtivacao);
    return date?.toDateString() === hoje.toDateString();
  }).length;
  const vendasSemana = ativos.filter(cliente => {
    const date = parseDate(cliente.dataAtivacao);
    return date != null && date >= inicioSemana && date <= hoje;
  }).length;
  const vendasMes = ativos.filter(cliente => {
    const date = parseDate(cliente.dataAtivacao);
    return date != null && monthKey(date) === monthKey(hoje);
  }).length;
  const comissoesAbertas = comissoes
    .filter(comissao => comissao.status === "PENDENTE")
    .reduce((total, comissao) => total + amount(comissao.valor), 0);
  const pctAdimplente = boletosMes.length > 0 ? Math.round((pgEmDia.length / boletosMes.length) * 100) : 0;

  const pagamentosData = [
    { name: "Pagos", valor: totalPgEmDia, qtd: pgEmDia.length, cor: "#10b981" },
    { name: "A Vencer", valor: totalAVencer, qtd: pgAVencer.length, cor: "#f59e0b" },
    { name: "Vencidos", valor: totalPgEmAtraso, qtd: pgEmAtraso.length, cor: "#ef4444" },
  ];

  const topVendedores = vendedores
    .map(vendedor => {
      const clientesVendedor = ativos.filter(cliente => cliente.vendedorId === vendedor.id);
      return {
        nome: vendedor.nome,
        ativos: clientesVendedor.length,
        receita: clientesVendedor.reduce((total, cliente) => total + amount(cliente.valorMensal), 0),
      };
    })
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 5);
  const mesNome = hoje.toLocaleString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between pb-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Visão geral da corretora — {mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}</p>
        </div>
        <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 font-semibold">
          {pctAdimplente}% adimplente
        </span>
      </div>

      <section className="space-y-2.5">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em]">Carteira de Beneficiários</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/clientes" className={cardLinkClass} aria-label="Ver clientes ativos" data-testid="link-card-admin-ativos">
            <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg shadow-blue-900/20">
              <div className="absolute right-3 top-3 opacity-20"><Users className="h-16 w-16" /></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Total Ativos</p>
              <p className="mt-2 text-5xl font-extrabold" data-testid="metric-ativos">{totalAtivos}</p>
              <p className="mt-1.5 text-sm text-blue-200">beneficiários na carteira</p>
              <div className="mt-3 flex gap-3 text-xs text-blue-300 border-t border-blue-500/50 pt-3">
                <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{totalTitulares} titulares</span>
                <span>·</span>
                <span>{totalDependentes} depend.</span>
              </div>
            </div>
          </Link>

          <Link href="/admin/financeiro" className={cardLinkClass} aria-label="Ver financeiro da carteira" data-testid="link-card-admin-receita">
            <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/20">
              <div className="absolute right-3 top-3 opacity-20"><DollarSign className="h-16 w-16" /></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Receita Mensal</p>
              <p className="mt-2 text-3xl font-extrabold leading-tight" data-testid="metric-receita">{formatMoney(receitaMensal)}</p>
              <p className="mt-1.5 text-sm text-emerald-200">soma dos contratos ativos</p>
              <div className="mt-3 flex gap-3 text-xs text-emerald-300 border-t border-emerald-500/50 pt-3">
                <span>Saldo corretora: <span className="font-bold text-white">{formatMoney(saldoTotal)}</span></span>
              </div>
            </div>
          </Link>

          <Link href="/admin/cancelados" className={cardLinkClass} aria-label="Ver clientes cancelados" data-testid="link-card-admin-cancelados">
            <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-rose-600 p-5 text-white shadow-lg shadow-red-900/20">
              <div className="absolute right-3 top-3 opacity-20"><UserX className="h-16 w-16" /></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-200">Cancelados</p>
              <p className="mt-2 text-5xl font-extrabold" data-testid="metric-cancelados">{cancelados.length}</p>
              <p className="mt-1.5 text-sm text-red-200">histórico de cancelamentos</p>
              <div className="mt-3 flex gap-3 text-xs text-red-300 border-t border-red-500/50 pt-3">
                <span>dados do cadastro de clientes</span>
              </div>
            </div>
          </Link>

          <Link href="/admin/comissoes" className={cardLinkClass} aria-label="Ver comissões a pagar" data-testid="link-card-admin-comissoes">
            <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-amber-900/20">
              <div className="absolute right-3 top-3 opacity-20"><Wallet className="h-16 w-16" /></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Comissões a Pagar</p>
              <p className="mt-2 text-3xl font-extrabold leading-tight" data-testid="metric-comissoes">{formatMoney(comissoesAbertas)}</p>
              <p className="mt-1.5 text-sm text-amber-200">pendentes de repasse</p>
              <div className="mt-3 text-xs text-amber-300 border-t border-amber-500/50 pt-3">
                <span className="flex items-center gap-1">Ver extrato <ArrowRight className="h-3 w-3" /></span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="space-y-2.5">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em]">Pagamentos — {mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/admin/financeiro" className={cardLinkClass} aria-label="Ver pagamentos em dia" data-testid="link-card-admin-pagos">
            <div className="rounded-xl border bg-card p-5 flex gap-4 items-center shadow-sm h-full">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0"><CheckCircle2 className="h-6 w-6 text-emerald-600" /></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Pagos em Dia</p><p className="text-2xl font-bold text-emerald-600 mt-0.5">{formatMoney(totalPgEmDia)}</p><p className="text-xs text-muted-foreground mt-0.5">{pgEmDia.length} boleto{pgEmDia.length !== 1 ? "s" : ""} confirmados</p></div>
            </div>
          </Link>
          <Link href="/admin/financeiro" className={cardLinkClass} aria-label="Ver pagamentos em atraso" data-testid="link-card-admin-atraso">
            <div className="rounded-xl border bg-card p-5 flex gap-4 items-center shadow-sm h-full">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0"><AlertCircle className="h-6 w-6 text-red-600" /></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Em Atraso</p><p className="text-2xl font-bold text-red-600 mt-0.5">{formatMoney(totalPgEmAtraso)}</p><p className="text-xs text-muted-foreground mt-0.5">{pgEmAtraso.length} boleto{pgEmAtraso.length !== 1 ? "s" : ""} vencido{pgEmAtraso.length !== 1 ? "s" : ""}</p></div>
            </div>
          </Link>
          <Link href="/admin/financeiro" className={cardLinkClass} aria-label="Ver pagamentos a vencer" data-testid="link-card-admin-a-vencer">
            <div className="rounded-xl border bg-card p-5 flex gap-4 items-center shadow-sm h-full">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0"><Clock className="h-6 w-6 text-amber-600" /></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">A Vencer</p><p className="text-2xl font-bold text-amber-600 mt-0.5">{formatMoney(totalAVencer)}</p><p className="text-xs text-muted-foreground mt-0.5">{pgAVencer.length} boleto{pgAVencer.length !== 1 ? "s" : ""} pendente{pgAVencer.length !== 1 ? "s" : ""}</p></div>
            </div>
          </Link>
        </div>
      </section>

      <section className="space-y-2.5">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em]">Novas Ativações</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Hoje", value: vendasHoje, sub: hoje.toLocaleDateString("pt-BR"), icon: CalendarDays },
            { label: "Esta Semana", value: vendasSemana, sub: "desde domingo", icon: TrendingUp },
            { label: mesNome.split(" ")[0], value: vendasMes, sub: "ativações no mês", icon: BadgeDollarSign },
          ].map(item => (
            <Link key={item.label} href="/admin/clientes" className={cardLinkClass} aria-label={`Ver clientes: ${item.label}`} data-testid={`link-card-admin-ativacoes-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="rounded-xl border bg-card p-5 flex gap-4 items-center shadow-sm h-full">
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0"><item.icon className="h-6 w-6 text-violet-600" /></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{item.label}</p><p className="text-4xl font-extrabold text-foreground mt-0.5">{item.value}</p><p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5">
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden" data-testid="chart-vendedores">
          <div className="px-5 py-4 border-b flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">Top Vendedores</span></div>
          <div className="p-4 space-y-3">
            {topVendedores.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum vendedor com carteira ativa.</p>
            ) : topVendedores.map((vendedor, index) => {
              const max = topVendedores[0]?.receita || 1;
              const pct = Math.round((vendedor.receita / max) * 100);
              return (
                <div key={vendedor.nome} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${index === 0 ? "bg-amber-500" : index === 1 ? "bg-slate-400" : "bg-amber-700"}`}>{index + 1}</span><span className="font-medium text-xs truncate max-w-[100px]">{vendedor.nome}</span></div>
                    <div className="text-right"><p className="text-xs font-bold">{formatMoney(vendedor.receita)}</p><p className="text-[10px] text-muted-foreground">{vendedor.ativos} ativos</p></div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${index === 0 ? "bg-primary" : "bg-primary/40"}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">Distribuição de Cobrança — {mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}</span></div>
          <div className="p-4 flex gap-4 items-center">
            <div className="flex-1 space-y-3">
              {pagamentosData.map(pagamento => (
                <div key={pagamento.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground text-xs font-medium">{pagamento.name}</span><span className="font-bold text-sm">{formatMoney(pagamento.valor)}</span></div>
                  <div className="flex items-center gap-2"><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${receitaMensal > 0 ? Math.min(100, (pagamento.valor / receitaMensal) * 100) : 0}%`, background: pagamento.cor }} /></div><span className="text-[10px] text-muted-foreground w-12 text-right">{pagamento.qtd} bol.</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b"><span className="font-semibold text-sm">Acesso Rápido</span></div>
          <div className="p-3 space-y-1.5">
            {[
              { href: "/admin/clientes", label: "Clientes Ativos", sub: `${totalAtivos} beneficiários`, icon: Users, color: "text-blue-600 bg-blue-50" },
              { href: "/admin/financeiro", label: "Financeiro", sub: "Boletos e cobranças", icon: Banknote, color: "text-emerald-600 bg-emerald-50" },
              { href: "/admin/comissoes", label: "Comissões", sub: `${formatMoney(comissoesAbertas)} a pagar`, icon: BadgeDollarSign, color: "text-amber-600 bg-amber-50" },
              { href: "/admin/relatorios", label: "Relatórios", sub: "Análises por vendedor", icon: BarChart3, color: "text-violet-600 bg-violet-50" },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group" data-testid={`link-atalho-admin-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}><item.icon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold leading-none">{item.label}</p><p className="text-xs text-muted-foreground mt-0.5 truncate">{item.sub}</p></div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}