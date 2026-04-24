import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from "recharts";

interface Vendedor {
  id: string; nome: string; totalClientes: number;
  totalPropostas: number; comissoesPendentes: number;
}

interface Comissao {
  vendedorId: string; valor?: string | null; status: string; mesReferencia?: string | null;
}

export default function GerenteRelatorios() {
  const { data: dvend, isLoading: lv } = useQuery({
    queryKey: ["gerente-vendedores-rel"],
    queryFn: () => apiFetch("/gerente/vendedores") as Promise<{ vendedores: Vendedor[] }>,
  });
  const { data: dcom, isLoading: lc } = useQuery({
    queryKey: ["gerente-comissoes-rel"],
    queryFn: () => apiFetch("/gerente/comissoes") as Promise<{ comissoes: Comissao[] }>,
  });

  const loading = lv || lc;
  const vendedores = (dvend as { vendedores: Vendedor[] } | undefined)?.vendedores ?? [];
  const comissoes = (dcom as { comissoes: Comissao[] } | undefined)?.comissoes ?? [];

  const carteiraPorVendedor = vendedores
    .sort((a, b) => b.totalClientes - a.totalClientes)
    .slice(0, 8)
    .map(v => ({ nome: v.nome.split(' ')[0], clientes: v.totalClientes }));

  const comissoesPorMes = comissoes.reduce<Record<string, number>>((acc, c) => {
    const mes = c.mesReferencia ?? "?";
    acc[mes] = (acc[mes] ?? 0) + parseFloat(c.valor ?? "0");
    return acc;
  }, {});
  const comissoesMesData = Object.entries(comissoesPorMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([mes, valor]) => ({ mes, valor }));

  const totalCarteira = vendedores.reduce((s, v) => s + v.totalClientes, 0);
  const totalComissoes = comissoes.reduce((s, c) => s + parseFloat(c.valor ?? "0"), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Visão consolidada da equipe</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Consultores</p>
                  <p className="text-xl font-bold">{vendedores.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Carteira</p>
                  <p className="text-xl font-bold">{totalCarteira}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Comissões Total</p>
                  <p className="text-xl font-bold">{formatMoney(totalComissoes)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lançamentos</p>
                  <p className="text-xl font-bold">{comissoes.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Carteira por Consultor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={carteiraPorVendedor} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <RechartsTooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                      formatter={(v: number) => [v, "Clientes"]}
                    />
                    <Bar dataKey="clientes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Comissões por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comissoesMesData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => `R$${v}`} />
                    <RechartsTooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                      formatter={(v: number) => [formatMoney(v), "Comissões"]}
                    />
                    <Bar dataKey="valor" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
