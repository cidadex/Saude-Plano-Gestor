import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";

interface DadosTitular {
  nome?: string; cpf?: string; plano?: string; valor?: number;
}

interface Proposta {
  id: string; vendedorId: string; status: string;
  dadosTitular?: DadosTitular; valorTotal?: string | null;
  createdAt?: string; dataAtivacao?: string | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  AGUARDANDO_ENVIO: { label: "Aguardando envio", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  ENVIADA_OPERADORA: { label: "Enviada à operadora", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  ACEITA: { label: "Aceita", cls: "bg-teal-100 text-teal-700 border-teal-200" },
  RECUSADA: { label: "Recusada", cls: "bg-red-100 text-red-700 border-red-200" },
  ATIVA: { label: "Ativa", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function GerentePropostas() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["gerente-propostas"],
    queryFn: () => apiFetch("/api/gerente/propostas") as Promise<{ propostas: Proposta[] }>,
  });

  const propostas = (data as { propostas: Proposta[] } | undefined)?.propostas ?? [];
  const filtradas = propostas.filter(p => {
    const nome = (p.dadosTitular as DadosTitular)?.nome ?? "";
    return (
      nome.toLowerCase().includes(search.toLowerCase()) ||
      p.vendedorId.toLowerCase().includes(search.toLowerCase()) ||
      p.status.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Propostas</h1>
        <p className="text-muted-foreground mt-1">{propostas.length} propostas no sistema</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {Object.values(STATUS_BADGE).map(s => (
          <Badge key={s.label} className={s.cls}>{s.label}: {propostas.filter(p => STATUS_BADGE[p.status]?.label === s.label).length}</Badge>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, consultor ou status..."
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
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Nenhuma proposta encontrada
                  </TableCell>
                </TableRow>
              ) : filtradas.map(p => {
                const dt = p.dadosTitular as DadosTitular | undefined;
                const badge = STATUS_BADGE[p.status];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{dt?.nome ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.vendedorId}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{dt?.plano ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(parseFloat(p.valorTotal ?? "0"))}</TableCell>
                    <TableCell>
                      {badge ? (
                        <Badge className={badge.cls}>{badge.label}</Badge>
                      ) : (
                        <Badge variant="outline">{p.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : "—"}
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
