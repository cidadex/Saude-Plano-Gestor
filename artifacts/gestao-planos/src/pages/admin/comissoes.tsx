import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { DollarSign, TrendingUp, CheckCircle2, Clock, Loader2, CircleCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

type ComissaoAdmin = {
  id: string;
  vendedorId: string;
  vendedorNome: string | null;
  clienteId: string | null;
  clienteNome: string;
  tipo: "VENDA" | "SERVICO";
  valor: string;
  mesReferencia: string;
  status: "PENDENTE" | "PAGO";
  planoCode: string | null;
  dataVenda: string | null;
  dataPagamento: string | null;
  observacao?: string | null;
  createdAt?: string | null;
};

function amount(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function displayDate(value: string | null | undefined): string {
  return value ? formatDate(value) : "—";
}

export default function AdminComissoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [vendedorFilter, setVendedorFilter] = useState("TODOS");
  const [tipoFilter, setTipoFilter] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [payTarget, setPayTarget] = useState<ComissaoAdmin | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-comissoes"],
    queryFn: () => apiFetch<{ comissoes: ComissaoAdmin[] }>("/admin/comissoes"),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/comissoes/${id}/pagar`, { method: "PATCH" }),
    onSuccess: () => {
      setPayTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-comissoes"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: "Comissão marcada como paga" });
    },
    onError: (mutationError: unknown) => {
      toast({
        variant: "destructive",
        title: "Não foi possível marcar a comissão como paga",
        description: mutationError instanceof Error ? mutationError.message : String(mutationError),
      });
    },
  });

  const comissoes = data?.comissoes ?? [];
  const vendedores = useMemo(
    () =>
      Array.from(
        new Set(comissoes.map(c => c.vendedorNome ?? c.vendedorId).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [comissoes],
  );

  const comissoesFiltradas = useMemo(
    () =>
      comissoes.filter(c => {
        const vendedor = c.vendedorNome ?? c.vendedorId;
        const matchVendedor = vendedorFilter === "TODOS" || vendedor === vendedorFilter;
        const matchTipo = tipoFilter === "TODOS" || c.tipo === tipoFilter;
        const matchStatus = statusFilter === "TODOS" || c.status === statusFilter;
        return matchVendedor && matchTipo && matchStatus;
      }),
    [comissoes, vendedorFilter, tipoFilter, statusFilter],
  );

  const totalPago = comissoes
    .filter(c => c.status === "PAGO")
    .reduce((total, c) => total + amount(c.valor), 0);
  const totalPendente = comissoes
    .filter(c => c.status === "PENDENTE")
    .reduce((total, c) => total + amount(c.valor), 0);
  const totalVenda = comissoes
    .filter(c => c.tipo === "VENDA")
    .reduce((total, c) => total + amount(c.valor), 0);
  const totalServico = comissoes
    .filter(c => c.tipo === "SERVICO")
    .reduce((total, c) => total + amount(c.valor), 0);

  const porVendedor = vendedores
    .map(vendedor => {
      const doVendedor = comissoes.filter(c => (c.vendedorNome ?? c.vendedorId) === vendedor);
      return {
        name: vendedor,
        Venda: doVendedor.filter(c => c.tipo === "VENDA").reduce((total, c) => total + amount(c.valor), 0),
        Serviço: doVendedor.filter(c => c.tipo === "SERVICO").reduce((total, c) => total + amount(c.valor), 0),
      };
    })
    .filter(v => v.Venda + v.Serviço > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-admin-comissoes">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1 pb-4 border-b">
          <h2 className="text-3xl font-bold tracking-tight">Comissões</h2>
          <p className="text-muted-foreground">Controle de repasses e comissionamento da equipe de vendas.</p>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive" data-testid="error-admin-comissoes">
            Não foi possível carregar as comissões. {error instanceof Error ? error.message : String(error)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight">Comissões</h2>
        <p className="text-muted-foreground">Controle de repasses e comissionamento da equipe de vendas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary" data-testid="card-comissoes-total-pago">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pago</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600" data-testid="metric-comissoes-pago">{formatMoney(totalPago)}</p>
            <p className="text-xs text-muted-foreground mt-1">{comissoes.filter(c => c.status === "PAGO").length} pagamentos realizados</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400" data-testid="card-comissoes-pendente">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">A Pagar</p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600" data-testid="metric-comissoes-pendente">{formatMoney(totalPendente)}</p>
            <p className="text-xs text-muted-foreground mt-1">{comissoes.filter(c => c.status === "PENDENTE").length} pendentes de repasse</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500" data-testid="card-comissoes-venda">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Agenciamento (Venda)</p>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatMoney(totalVenda)}</p>
            <p className="text-xs text-muted-foreground mt-1">{comissoes.filter(c => c.tipo === "VENDA").length} comissões de venda</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500" data-testid="card-comissoes-servico">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Serviço (Vitalícia)</p>
              <DollarSign className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-2xl font-bold text-violet-600">{formatMoney(totalServico)}</p>
            <p className="text-xs text-muted-foreground mt-1">{comissoes.filter(c => c.tipo === "SERVICO").length} comissões mensais</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base">Comissões por Vendedor</CardTitle>
          <CardDescription>Valores calculados a partir das comissões registradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 h-[220px]">
          {porVendedor.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground" data-testid="empty-comissoes-chart">
              Nenhuma comissão registrada.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porVendedor} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <RechartsTooltip formatter={(value: number) => formatMoney(value)} />
                <Legend />
                <Bar dataKey="Venda" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Serviço" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base">Extrato de Comissões</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-filtro-comissao-vendedor">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os vendedores</SelectItem>
                  {vendedores.map(vendedor => <SelectItem key={vendedor} value={vendedor}>{vendedor}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-filtro-comissao-tipo">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os tipos</SelectItem>
                  <SelectItem value="VENDA">Ativação (única)</SelectItem>
                  <SelectItem value="SERVICO">Serviço</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-filtro-comissao-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
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
              <TableHead>Beneficiário</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Data Venda</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground" data-testid="empty-comissoes">
                  Nenhum resultado.
                </TableCell>
              </TableRow>
            ) : comissoesFiltradas.map(comissao => (
              <TableRow key={comissao.id} data-testid={`row-comissao-${comissao.id}`}>
                <TableCell className="font-semibold text-sm">{comissao.vendedorNome ?? comissao.vendedorId}</TableCell>
                <TableCell className="text-sm">
                  <span data-testid={`text-comissao-cliente-${comissao.id}`}>{comissao.clienteNome}</span>
                  {comissao.clienteId && <span className="block text-[10px] text-muted-foreground font-mono">{comissao.clienteId}</span>}
                </TableCell>
                <TableCell><Badge variant="outline" className="font-mono text-xs">{comissao.planoCode ?? "—"}</Badge></TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={`text-xs ${comissao.tipo === "VENDA"
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-violet-300 bg-violet-50 text-violet-700"}`}
                  >
                    {comissao.tipo === "VENDA" ? "Ativação (única)" : "Serviço"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{comissao.mesReferencia}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{displayDate(comissao.dataVenda)}</TableCell>
                <TableCell className="text-right font-semibold">{formatMoney(amount(comissao.valor))}</TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={`text-xs ${comissao.status === "PAGO"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-amber-300 bg-amber-50 text-amber-700"}`}
                  >
                    {comissao.status}
                  </Badge>
                  {comissao.status === "PAGO" && comissao.dataPagamento && (
                    <span className="block text-[10px] text-muted-foreground mt-1">{displayDate(comissao.dataPagamento)}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {comissao.status === "PENDENTE" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => setPayTarget(comissao)}
                      disabled={payMutation.isPending}
                      data-testid={`button-pagar-comissao-${comissao.id}`}
                    >
                      <CircleCheck className="h-3.5 w-3.5" /> Marcar como paga
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Concluído</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {comissoesFiltradas.length > 0 && (
              <TableRow className="bg-muted/30 font-bold border-t-2">
                <TableCell colSpan={6}>TOTAL ({comissoesFiltradas.length} registros)</TableCell>
                <TableCell className="text-right">{formatMoney(comissoesFiltradas.reduce((total, c) => total + amount(c.valor), 0))}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog
        open={!!payTarget}
        onOpenChange={open => {
          if (!open && !payMutation.isPending) setPayTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Marcar a comissão de <strong>{payTarget?.vendedorNome ?? payTarget?.vendedorId}</strong> para{" "}
              <strong>{payTarget?.clienteNome}</strong>, no valor de{" "}
              <strong>{payTarget ? formatMoney(amount(payTarget.valor)) : "—"}</strong>, como paga?
              Esta ação registra a data do pagamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {payMutation.error != null && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="error-pagar-comissao">
              {payMutation.error instanceof Error ? payMutation.error.message : String(payMutation.error)}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={payMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={payMutation.isPending || !payTarget}
              onClick={event => {
                event.preventDefault();
                if (payTarget) payMutation.mutate(payTarget.id);
              }}
              data-testid="button-confirmar-pagamento-comissao"
            >
              {payMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando...</> : "Confirmar pagamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}