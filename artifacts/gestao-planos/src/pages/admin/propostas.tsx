import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { propostas } from "@/data/propostas";
import { formatMoney, getStatusBadgeVariant } from "@/lib/format";
import { Search, SlidersHorizontal } from "lucide-react";

export default function AdminPropostas() {
  const [search, setSearch] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const vendedores = useMemo(() => Array.from(new Set(propostas.map(p => p.vendedor))), []);
  const statuses = useMemo(() => Array.from(new Set(propostas.map(p => p.status))), []);

  const filteredPropostas = useMemo(() => {
    return propostas.filter(p => {
      const matchSearch = p.clienteNome.toLowerCase().includes(search.toLowerCase()) || p.clienteCpf.includes(search);
      const matchVendedor = vendedorFilter === "TODOS" || p.vendedor === vendedorFilter;
      const matchStatus = statusFilter === "TODOS" || p.status === statusFilter;
      return matchSearch && matchVendedor && matchStatus;
    });
  }, [search, vendedorFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Propostas</h2>
        <p className="text-muted-foreground">Acompanhamento do funil de vendas e envios para operadora.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Buscar Cliente</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nome ou CPF..." 
                  className="pl-9" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  data-testid="input-search-propostas"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium">Vendedor</label>
              <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                <SelectTrigger data-testid="select-vendedor-prop">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os vendedores</SelectItem>
                  {vendedores.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-prop">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  {statuses.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Plano (Cód)</TableHead>
                <TableHead>Data Envio</TableHead>
                <TableHead>Valor Prev.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPropostas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhuma proposta encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPropostas.map((prop) => (
                  <TableRow key={prop.id} data-testid={`row-proposta-${prop.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{prop.clienteNome}</span>
                        <span className="text-xs text-muted-foreground">{prop.clienteCpf}</span>
                      </div>
                    </TableCell>
                    <TableCell>{prop.vendedor}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs truncate max-w-[180px]" title={prop.plano}>{prop.plano}</span>
                        <span className="text-xs text-muted-foreground font-mono">{prop.codigoPlano}</span>
                      </div>
                    </TableCell>
                    <TableCell>{prop.dataEnvio}</TableCell>
                    <TableCell className="font-semibold">{formatMoney(prop.valor)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeVariant(prop.status)}>
                        {prop.status.replace('_', ' ')}
                      </Badge>
                      {prop.observacao && (
                        <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] truncate" title={prop.observacao}>
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
