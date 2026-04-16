import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { clientesCancelados, getTotalDevedores } from "@/data/cancelados";
import { formatMoney } from "@/lib/format";
import { Search, AlertTriangle, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminCancelados() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");

  const filteredCancelados = useMemo(() => {
    return clientesCancelados.filter(c => {
      const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search);
      const hasDebito = c.debitoTotal && c.debitoTotal > 0;
      
      if (filter === "COM_DEBITO") return matchSearch && hasDebito;
      if (filter === "SEM_DEBITO") return matchSearch && !hasDebito;
      return matchSearch;
    });
  }, [search, filter]);

  const totalDevedores = getTotalDevedores();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Clientes Cancelados</h2>
        <p className="text-muted-foreground">Histórico de cancelamentos e gestão de inadimplentes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-800 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" /> Total em Débito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-500">
              {formatMoney(totalDevedores)}
            </div>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">Valor recuperável de ex-clientes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou CPF..." 
                className="pl-9" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-search-cancelados"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar débito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="COM_DEBITO">Com Débito</SelectItem>
                  <SelectItem value="SEM_DEBITO">Sem Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <div className="rounded-b-md border-0 border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Resp.</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Data Canc.</TableHead>
                <TableHead className="text-right">Débito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCancelados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum cliente cancelado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCancelados.map((cliente) => (
                  <TableRow key={cliente.id} data-testid={`row-cancelado-${cliente.id}`}>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{cliente.cpf}</TableCell>
                    <TableCell>{cliente.responsavel}</TableCell>
                    <TableCell>{cliente.plano || '-'}</TableCell>
                    <TableCell>{cliente.dataCancelamento || '-'}</TableCell>
                    <TableCell className="text-right">
                      {cliente.debitoTotal && cliente.debitoTotal > 0 ? (
                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                          {formatMoney(cliente.debitoTotal)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem débito</span>
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
