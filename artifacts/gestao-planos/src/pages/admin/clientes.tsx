import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clientesAtivos } from "@/data/clientes";
import { formatMoney, getStatusBadgeVariant } from "@/lib/format";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function AdminClientes() {
  const [search, setSearch] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState("TODOS");
  const [planoFilter, setPlanoFilter] = useState("TODOS");
  const [pagamentoFilter, setPagamentoFilter] = useState("TODOS");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const vendedores = useMemo(() => Array.from(new Set(clientesAtivos.map(c => c.representante || c.responsavel))).filter(Boolean), []);
  const planos = useMemo(() => Array.from(new Set(clientesAtivos.map(c => c.plano))), []);
  const pagamentos = useMemo(() => Array.from(new Set(clientesAtivos.map(c => c.formaPagamento))), []);

  const filteredClientes = useMemo(() => {
    return clientesAtivos.filter(c => {
      const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search);
      const repOuResp = c.representante || c.responsavel;
      const matchVendedor = vendedorFilter === "TODOS" || repOuResp === vendedorFilter;
      const matchPlano = planoFilter === "TODOS" || c.plano === planoFilter;
      const matchPagamento = pagamentoFilter === "TODOS" || c.formaPagamento === pagamentoFilter;
      return matchSearch && matchVendedor && matchPlano && matchPagamento;
    });
  }, [search, vendedorFilter, planoFilter, pagamentoFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Clientes Ativos</h2>
        <p className="text-muted-foreground">Gerencie a carteira de clientes ativos da corretora.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nome ou CPF..." 
                  className="pl-9" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  data-testid="input-search-clientes"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium">Vendedor</label>
              <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                <SelectTrigger data-testid="select-vendedor">
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
              <label className="text-sm font-medium">Plano</label>
              <Select value={planoFilter} onValueChange={setPlanoFilter}>
                <SelectTrigger data-testid="select-plano">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os planos</SelectItem>
                  {planos.map(p => (
                    <SelectItem key={p} value={p}>Plano {p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Forma Pagto.</label>
              <Select value={pagamentoFilter} onValueChange={setPagamentoFilter}>
                <SelectTrigger data-testid="select-pagamento">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas as formas</SelectItem>
                  {pagamentos.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
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
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Venc.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClientes.map((cliente) => (
                  <Collapsible 
                    key={cliente.id} 
                    asChild 
                    open={expandedId === cliente.id}
                    onOpenChange={(open) => setExpandedId(open ? cliente.id : null)}
                  >
                    <>
                      <TableRow className="cursor-pointer group" data-testid={`row-cliente-${cliente.id}`}>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              {expandedId === cliente.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{cliente.nome}</span>
                            <span className="text-xs text-muted-foreground">{cliente.cpf}</span>
                          </div>
                        </TableCell>
                        <TableCell>{cliente.representante || cliente.responsavel}</TableCell>
                        <TableCell>{cliente.plano}</TableCell>
                        <TableCell className="font-semibold">{formatMoney(cliente.valor)}</TableCell>
                        <TableCell>Dia {cliente.vencimento}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeVariant(cliente.status)}>
                            {cliente.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-0 border-b-0">
                            <div className="p-4 grid md:grid-cols-3 gap-4 text-sm border-b">
                              <div className="space-y-2">
                                <p><span className="font-semibold text-muted-foreground">Código:</span> {cliente.codigo}</p>
                                <p><span className="font-semibold text-muted-foreground">Data Nasc.:</span> {cliente.dataNascimento} ({cliente.idade} anos)</p>
                                <p><span className="font-semibold text-muted-foreground">Tipo:</span> {cliente.tipo}</p>
                                <p><span className="font-semibold text-muted-foreground">Forma Pagto.:</span> {cliente.formaPagamento}</p>
                              </div>
                              <div className="space-y-2">
                                <p><span className="font-semibold text-muted-foreground">Telefone:</span> {cliente.telefone || 'Não informado'}</p>
                                <p><span className="font-semibold text-muted-foreground">Cidade/UF:</span> {cliente.cidade}/{cliente.estado}</p>
                                <p><span className="font-semibold text-muted-foreground">Bairro:</span> {cliente.bairro}</p>
                                <p><span className="font-semibold text-muted-foreground">Ativação:</span> {cliente.dataAtivacao}</p>
                              </div>
                              <div className="space-y-2">
                                <p><span className="font-semibold text-muted-foreground">Código Plano:</span> {cliente.codigoPlano}</p>
                                <p><span className="font-semibold text-muted-foreground">Vr. Plano:</span> {formatMoney(cliente.vrPl)}</p>
                                <p><span className="font-semibold text-muted-foreground">Saldo:</span> {formatMoney(cliente.saldo)}</p>
                                {cliente.observacao && (
                                  <p><span className="font-semibold text-muted-foreground">Obs:</span> <span className="text-amber-600 font-medium">{cliente.observacao}</span></p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
