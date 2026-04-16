import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getPropostasByVendedor } from "@/data/propostas";
import { vendedorAtual } from "@/data/vendedores";
import { formatMoney, getStatusBadgeVariant } from "@/lib/format";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VendedorPropostas() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const minhasPropostas = getPropostasByVendedor(vendedorAtual.nome);
  const statuses = useMemo(() => Array.from(new Set(minhasPropostas.map(p => p.status))), [minhasPropostas]);

  const filteredPropostas = useMemo(() => {
    return minhasPropostas.filter(p => {
      const matchSearch = p.clienteNome.toLowerCase().includes(search.toLowerCase()) || p.clienteCpf.includes(search);
      const matchStatus = statusFilter === "TODOS" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter, minhasPropostas]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between pb-4 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Minhas Propostas</h2>
          <p className="text-muted-foreground">Acompanhe o andamento das suas vendas.</p>
        </div>
        <Button className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nova Proposta
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 bg-muted/20">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <SlidersHorizontal className="h-4 w-4" /> Refinar Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Cliente</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nome ou CPF..." 
                  className="pl-9 bg-background" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Status da Proposta</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  {statuses.map(s => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <div className="rounded-md border-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2">
                <TableHead className="font-semibold text-foreground">Cliente / CPF</TableHead>
                <TableHead className="font-semibold text-foreground">Plano</TableHead>
                <TableHead className="font-semibold text-foreground">Envio</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Valor Previsto</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPropostas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-8 w-8 text-muted-foreground/30" />
                      <p>Nenhuma proposta encontrada com estes filtros.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPropostas.map((prop) => (
                  <TableRow key={prop.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">{prop.clienteNome}</span>
                        <span className="text-xs text-muted-foreground font-mono">{prop.clienteCpf}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{prop.plano}</span>
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded w-fit">{prop.codigoPlano}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{prop.dataEnvio}</TableCell>
                    <TableCell className="font-bold text-right text-foreground">{formatMoney(prop.valor)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`${getStatusBadgeVariant(prop.status)} font-medium border whitespace-nowrap`}>
                        {prop.status.replace('_', ' ')}
                      </Badge>
                      {prop.observacao && (
                        <p className="text-[10px] text-muted-foreground mt-1.5 max-w-[180px] mx-auto truncate" title={prop.observacao}>
                          {prop.observacao}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
