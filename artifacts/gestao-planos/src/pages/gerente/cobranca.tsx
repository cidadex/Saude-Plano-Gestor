import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Loader2 } from "lucide-react";

interface Boleto {
  id: string; clienteId: string; valor: string; vencimento: string;
  status: string; mesReferencia: string; codigoBarras?: string | null;
}

export default function GerenteCobranca() {
  const { data, isLoading } = useQuery({
    queryKey: ["gerente-boletos-cobranca"],
    queryFn: () => apiFetch("/gerente/boletos") as Promise<{ boletos: Boleto[] }>,
  });

  const boletos = (data as { boletos: Boleto[] } | undefined)?.boletos ?? [];
  const vencidos = boletos.filter(b => b.status === "VENCIDO");
  const pendentes = boletos.filter(b => b.status === "PENDENTE");
  const inadimplentes = [...vencidos, ...pendentes.filter(b => {
    const venc = new Date(b.vencimento + "T00:00:00");
    return venc < new Date();
  })];

  const totalEmAberto = [...vencidos].reduce((s, b) => s + parseFloat(b.valor), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cobrança</h1>
        <p className="text-muted-foreground mt-1">Boletos vencidos e em atraso</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-red-200/60 p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total Vencido</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatMoney(totalEmAberto)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{vencidos.length} boletos</p>
        </Card>
        <Card className="border-border/50 p-5">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Total Pendente</p>
          <p className="text-2xl font-bold text-amber-600">
            {formatMoney(pendentes.reduce((s, b) => s + parseFloat(b.valor), 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{pendentes.length} boletos</p>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      ) : (
        <Card className="border-border/50">
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
              {vencidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Nenhum boleto vencido
                  </TableCell>
                </TableRow>
              ) : vencidos.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="text-muted-foreground text-sm font-mono">{b.clienteId}</TableCell>
                  <TableCell className="text-red-600 text-sm font-medium">
                    {new Date(b.vencimento + "T00:00:00").toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{b.mesReferencia}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(parseFloat(b.valor))}</TableCell>
                  <TableCell>
                    <Badge className="bg-red-100 text-red-700 border-red-200">Vencido</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
