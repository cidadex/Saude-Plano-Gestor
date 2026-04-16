import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { vendedorAtual } from "@/data/vendedores";
import { getPropostasByVendedor } from "@/data/propostas";
import { getTotalComissoesVendedor } from "@/data/comissoes";
import { getBoletosByVendedor } from "@/data/boletos";
import { getClientesByVendedor } from "@/data/clientes";
import { formatMoney, getStatusBadgeVariant } from "@/lib/format";
import { Link } from "wouter";
import {
  FileText, DollarSign, Receipt, ArrowRight, Users,
  CheckCircle2, AlertCircle, Clock, UserCheck, TrendingUp,
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
  const propostasRecentes = propostas.slice(0, 5);

  const pctAdimplente = boletosMes.length > 0
    ? Math.round((pgEmDia.length / boletosMes.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Olá, {vendedorAtual.nome}</h2>
        <p className="text-muted-foreground">Painel de acompanhamento da sua carteira e resultados.</p>
      </div>

      {/* ── MINHA CARTEIRA ─────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Minha Carteira</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="metric-ativos-vendedor" className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Ativo</CardTitle>
              <Users className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold">{meusClientes.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Beneficiários ativos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Titulares</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold">{totalTitulares}</div>
              <p className="text-xs text-muted-foreground mt-1">{totalDependentes} dependente{totalDependentes !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card data-testid="metric-receita-vendedor" className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita da Carteira</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-primary">{formatMoney(receitaCarteira)}</div>
              <p className="text-xs text-muted-foreground mt-1">Faturamento mensal</p>
            </CardContent>
          </Card>

          <Card data-testid="metric-comissoes-vendedor" className="border-l-4 border-l-amber-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Minhas Comissões</CardTitle>
              <Receipt className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-amber-600">{formatMoney(vendedorAtual.comissaoTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Histórico total</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── PAGAMENTOS ABRIL 2026 ──────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pagamentos — Abril 2026</h3>
          <Badge variant="outline" className="text-xs">{pctAdimplente}% adimplente</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pagamentos em Dia</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-emerald-600">{formatMoney(totalPgEmDia)}</div>
              <p className="text-xs text-muted-foreground mt-1">{pgEmDia.length} boleto{pgEmDia.length !== 1 ? 's' : ''} pagos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Atraso</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-red-600">{formatMoney(totalPgEmAtraso)}</div>
              <p className="text-xs text-muted-foreground mt-1">{pgEmAtraso.length} vencido{pgEmAtraso.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">A Vencer</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-amber-600">{formatMoney(totalAVencer)}</div>
              <p className="text-xs text-muted-foreground mt-1">{pgAVencer.length} pendente{pgAVencer.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── NOVAS VENDAS ──────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Minhas Ativações</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-l-4 border-l-violet-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold">{vendasHoje}</div>
              <p className="text-xs text-muted-foreground mt-1">16/04/2026</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-violet-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Esta Semana</CardTitle>
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold">{vendasSemana}</div>
              <p className="text-xs text-muted-foreground mt-1">10/04 a 16/04</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-violet-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Este Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold">{vendasMes}</div>
              <p className="text-xs text-muted-foreground mt-1">Ativações em Abril</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── PROPOSTAS + FINANCEIRO ─────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Propostas Recentes</CardTitle>
                <CardDescription>Status das suas últimas vendas</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/vendedor/propostas" className="flex items-center gap-1 text-xs">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propostasRecentes.map(prop => (
                  <TableRow key={prop.id}>
                    <TableCell className="font-medium">
                      <div className="truncate max-w-[150px] text-sm" title={prop.clienteNome}>
                        {prop.clienteNome}
                      </div>
                      <div className="text-xs text-muted-foreground">{prop.dataEnvio}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{prop.codigoPlano || prop.plano}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={getStatusBadgeVariant(prop.status)}>
                        {prop.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-primary/20">
          <CardHeader className="bg-primary/5 pb-3 border-b">
            <CardTitle className="text-primary flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5" /> Resumo de Comissões
            </CardTitle>
            <CardDescription>Acompanhamento de repasses</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Agenciamento (Venda)</span>
                <span className="font-semibold">{formatMoney(comissoes.venda)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Serviço (Vitalícia)</span>
                <span className="font-semibold">{formatMoney(comissoes.servico)}</span>
              </div>
              <div className="pt-3 border-t flex justify-between items-center font-bold">
                <span>Total Acumulado</span>
                <span className="text-primary text-lg">{formatMoney(vendedorAtual.comissaoTotal)}</span>
              </div>
            </div>
            <Button className="w-full" asChild>
              <Link href="/vendedor/comissoes">Ver Extrato Completo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
