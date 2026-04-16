import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clientesAtivos, getTotalMensal, getTotalPorFormaPagamento } from "@/data/clientes";
import { clientesCancelados } from "@/data/cancelados";
import { comissoes } from "@/data/comissoes";
import { vendedores } from "@/data/vendedores";
import { formatMoney } from "@/lib/format";
import { Users, UserMinus, DollarSign, Wallet } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export default function AdminDashboard() {
  const totalAtivos = clientesAtivos.length;
  const receitaMensal = getTotalMensal();
  const totalCancelados = clientesCancelados.length;
  
  const comissoesAbertas = comissoes
    .filter(c => c.status === 'PENDENTE')
    .reduce((acc, c) => acc + c.valor, 0);

  const pagamentos = getTotalPorFormaPagamento();
  const pagamentosData = Object.entries(pagamentos).map(([name, value]) => ({
    name: name || 'Não informada',
    value
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff7300'];

  const vendedoresData = vendedores.map(v => ({
    name: v.nome,
    Ativos: v.totalAtivos,
    Cancelados: v.totalCancelados
  })).sort((a, b) => b.Ativos - a.Ativos).slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Geral</h2>
        <p className="text-muted-foreground">Visão panorâmica da corretora, clientes ativos e faturamento.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="metric-ativos">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAtivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Carteira atual</p>
          </CardContent>
        </Card>
        
        <Card data-testid="metric-receita">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatMoney(receitaMensal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Soma de boletos ativos</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-cancelados">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelamentos</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalCancelados}</div>
            <p className="text-xs text-muted-foreground mt-1">Histórico total</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-comissoes">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões a Pagar</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatMoney(comissoesAbertas)}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendentes de repasse</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1" data-testid="chart-pagamentos">
          <CardHeader>
            <CardTitle>Receita por Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pagamentosData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pagamentosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => formatMoney(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1" data-testid="chart-vendedores">
          <CardHeader>
            <CardTitle>Top Vendedores (Ativos vs Cancelados)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={vendedoresData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="Ativos" stackId="a" fill="#10b981" />
                <Bar dataKey="Cancelados" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
