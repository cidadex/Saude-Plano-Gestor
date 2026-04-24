import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/format";
import {
  Users, FileText, DollarSign, CheckCircle2, AlertCircle, Clock,
  TrendingUp, Briefcase, Receipt, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Stats {
  totalClientes: number;
  totalTitulares: number;
  totalDependentes: number;
  propostas_aguardando: number;
  propostas_ativas: number;
  totalReceitaMensal: number;
  comissoesPendentes: number;
  boletosEmDia: number;
  boletosVencidos: number;
  boletosAVencer: number;
}

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GerenteDashboard() {
  const { user } = useAuth();
  const permissoes = user?.permissoes ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["gerente-stats"],
    queryFn: () => apiFetch("/api/gerente/stats") as Promise<Stats>,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const s = data as Stats | undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bom dia, {user?.nome?.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground mt-1">Visão geral da equipe — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {permissoes.includes("ver_clientes") && (
          <StatCard label="Clientes Ativos" value={s?.totalClientes ?? 0}
            sub={`${s?.totalTitulares ?? 0} titulares · ${s?.totalDependentes ?? 0} dep.`}
            icon={Users} color="bg-blue-500" />
        )}
        {permissoes.includes("ver_clientes") && (
          <StatCard label="Receita Mensal" value={formatMoney(s?.totalReceitaMensal ?? 0)}
            sub="carteira consolidada" icon={TrendingUp} color="bg-emerald-500" />
        )}
        {permissoes.includes("ver_propostas") && (
          <StatCard label="Propostas Ativas" value={s?.propostas_ativas ?? 0}
            sub={`${s?.propostas_aguardando ?? 0} aguardando envio`}
            icon={FileText} color="bg-amber-500" />
        )}
        {permissoes.includes("ver_comissoes") && (
          <StatCard label="Comissões Pendentes" value={formatMoney(s?.comissoesPendentes ?? 0)}
            sub="a liquidar este mês" icon={DollarSign} color="bg-violet-500" />
        )}
      </div>

      {permissoes.includes("ver_financeiro") && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Boletos — Abril 2026</h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Em Dia" value={s?.boletosEmDia ?? 0} icon={CheckCircle2} color="bg-emerald-500" />
            <StatCard label="A Vencer" value={s?.boletosAVencer ?? 0} icon={Clock} color="bg-amber-500" />
            <StatCard label="Vencidos" value={s?.boletosVencidos ?? 0} icon={AlertCircle} color="bg-red-500" />
          </div>
        </div>
      )}

      {permissoes.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma permissão configurada. Contate o administrador.</p>
        </div>
      )}
    </div>
  );
}
