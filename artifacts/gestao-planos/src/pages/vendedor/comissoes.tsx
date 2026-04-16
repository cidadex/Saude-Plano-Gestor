import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getComissoesByTipo, getTotalComissoesVendedor } from "@/data/comissoes";
import { vendedorAtual } from "@/data/vendedores";
import { formatMoney } from "@/lib/format";
import { DollarSign, Wallet, ArrowUpRight } from "lucide-react";

export default function VendedorComissoes() {
  const nomeVendedor = vendedorAtual.nome;
  const comissoesVenda = getComissoesByTipo(nomeVendedor, 'VENDA');
  const comissoesServico = getComissoesByTipo(nomeVendedor, 'SERVICO');
  const totais = getTotalComissoesVendedor(nomeVendedor);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Extrato de Comissões</h2>
        <p className="text-muted-foreground">Controle de recebimentos por agenciamento e taxa de serviço.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground border-primary/20 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
              <Wallet className="h-4 w-4" /> Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatMoney(totais.venda + totais.servico)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <ArrowUpRight className="h-4 w-4" /> Venda (Agenciamento)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatMoney(totais.venda)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" /> Serviço (Vitalícia)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatMoney(totais.servico)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="venda" className="w-full mt-8">
        <TabsList className="grid w-full max-w-md grid-cols-2 p-1">
          <TabsTrigger value="venda" className="text-sm font-medium data-[state=active]:bg-background">Comissões de Venda</TabsTrigger>
          <TabsTrigger value="servico" className="text-sm font-medium data-[state=active]:bg-background">Taxa de Serviço</TabsTrigger>
        </TabsList>
        
        <TabsContent value="venda" className="mt-6">
          <Card className="border shadow-sm">
            <CardHeader className="bg-muted/20 pb-4">
              <CardTitle className="text-lg">Extrato de Agenciamento</CardTitle>
              <CardDescription>Pagas no primeiro mês após a ativação do plano.</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Data Venda</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoesVenda.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhuma comissão de venda encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  comissoesVenda.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-foreground whitespace-nowrap">{c.mesReferencia}</TableCell>
                      <TableCell className="font-medium">{c.clienteNome}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{c.plano}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.dataVenda || '-'}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">{formatMoney(c.valor)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={c.status === 'PAGO' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="servico" className="mt-6">
          <Card className="border shadow-sm">
            <CardHeader className="bg-muted/20 pb-4">
              <CardTitle className="text-lg">Extrato de Serviços (Vitalício)</CardTitle>
              <CardDescription>Recorrente enquanto o cliente permanecer ativo.</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoesServico.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhuma comissão de serviço encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  comissoesServico.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-foreground whitespace-nowrap">{c.mesReferencia}</TableCell>
                      <TableCell className="font-medium">{c.clienteNome}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{c.plano}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">{formatMoney(c.valor)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={c.status === 'PAGO' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
