import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";

interface Comissao {
  id: string; vendedorId: string; clienteNome?: string | null;
  tipo: string; valor?: string | null; mesReferencia?: string | null;
  status: string; planoCode?: string | null; dataVenda?: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  PAGO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDENTE: "bg-amber-100 text-amber-700 border-amber-200",
  CANCELADO: "bg-red-100 text-red-700 border-red-200",
};

export default function GerenteComissoes() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["gerente-comissoes"],
    queryFn: () => apiFetch("/api/gerente/comissoes") as Promise<{ comissoes: Comissao[] }>,
  });

  const comissoes = (data as { comissoes: Comissao[] } | undefined)?.comissoes ?? [];
  const filtradas = comissoes.filter(c =>
    (c.clienteNome ?? "").toLowerCase().includes(search.toLowerCase()) ||
    c.vendedorId.toLowerCase().includes(search.toLowerCase()) ||
    (c.mesReferencia ?? "").includes(search)
  );

  const totalPago = comissoes.filter(c => c.status === "PAGO").reduce((s, c) => s + parseFloat(c.valor ?? "0"), 0);
  const totalPendente = comissoes.filter(c => c.status === "PENDENTE").reduce((s, c) => s + parseFloat(c.valor ?? "0"), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comissões</h1>
        <p className="text-muted-foreground mt-1">{comissoes.length} lançamentos</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/50 p-5">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Total Pago</p>
          <p className="text-2xl font-bold text-emerald-600">{formatMoney(totalPago)}</p>
        </Card>
        <Card className="border-border/50 p-5">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">A Liquidar</p>
          <p className="text-2xl font-bold text-amber-600">{formatMoney(totalPendente)}</p>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, consultor ou mês..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
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
                <TableHead>Cliente</TableHead>
                <TableHead>Consultor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Mês Ref.</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nenhuma comissão encontrada
                  </TableCell>
                </TableRow>
              ) : filtradas.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.clienteNome ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.vendedorId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.tipo === "VENDA" ? "Venda" : "Serviço"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.mesReferencia ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.planoCode ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(parseFloat(c.valor ?? "0"))}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[c.status] ?? ""}>{c.status === "PAGO" ? "Pago" : c.status === "PENDENTE" ? "Pendente" : c.status}</Badge>
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
