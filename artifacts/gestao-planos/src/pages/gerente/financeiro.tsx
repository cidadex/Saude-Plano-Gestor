import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

interface Boleto {
  id: string; clienteId: string; valor: string; vencimento: string;
  status: string; mesReferencia: string; codigoBarras?: string | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PAGO: { label: "Pago", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  PENDENTE: { label: "Pendente", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  VENCIDO: { label: "Vencido", cls: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle },
};

export default function GerenteFinanceiro() {
  const { data, isLoading } = useQuery({
    queryKey: ["gerente-boletos"],
    queryFn: () => apiFetch("/gerente/boletos") as Promise<{ boletos: Boleto[] }>,
  });

  const boletos = (data as { boletos: Boleto[] } | undefined)?.boletos ?? [];
  const mesAtual = "04/2026";
  const boletosMes = boletos.filter(b => b.mesReferencia === mesAtual);

  const pagos = boletosMes.filter(b => b.status === "PAGO");
  const pendentes = boletosMes.filter(b => b.status === "PENDENTE");
  const vencidos = boletosMes.filter(b => b.status === "VENCIDO");

  const totalPago = pagos.reduce((s, b) => s + parseFloat(b.valor), 0);
  const totalPendente = pendentes.reduce((s, b) => s + parseFloat(b.valor), 0);
  const totalVencido = vencidos.reduce((s, b) => s + parseFloat(b.valor), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground mt-1">Boletos de {mesAtual}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-emerald-200/60">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-muted-foreground">Pagos</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatMoney(totalPago)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pagos.length} boletos</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200/60">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-muted-foreground">A Vencer</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatMoney(totalPendente)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pendentes.length} boletos</p>
          </CardContent>
        </Card>
        <Card className="border-red-200/60">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-muted-foreground">Vencidos</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatMoney(totalVencido)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{vencidos.length} boletos</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      ) : (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Todos os Boletos — {mesAtual}</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente ID</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Mês Ref.</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boletosMes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum boleto encontrado
                  </TableCell>
                </TableRow>
              ) : boletosMes.map(b => {
                const badge = STATUS_BADGE[b.status];
                return (
                  <TableRow key={b.id}>
                    <TableCell className="text-muted-foreground text-sm font-mono">{b.clienteId}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(b.vencimento + "T00:00:00").toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{b.mesReferencia}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(parseFloat(b.valor))}</TableCell>
                    <TableCell>
                      {badge ? (
                        <Badge className={badge.cls}>{badge.label}</Badge>
                      ) : (
                        <Badge variant="outline">{b.status}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
