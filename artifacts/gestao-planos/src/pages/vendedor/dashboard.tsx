import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { vendedorAtual } from "@/data/vendedores";
import { getPropostasByVendedor } from "@/data/propostas";
import { getTotalComissoesVendedor } from "@/data/comissoes";
import { getBoletosByVendedor } from "@/data/boletos";
import { formatMoney, getStatusBadgeVariant } from "@/lib/format";
import { Link } from "wouter";
import { FileText, DollarSign, Receipt, ArrowRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function VendedorDashboard() {
  const propostas = getPropostasByVendedor(vendedorAtual.nome);
  const boletos = getBoletosByVendedor(vendedorAtual.nome);
  const comissoes = getTotalComissoesVendedor(vendedorAtual.nome);
  
  const boletosPendentes = boletos.filter(b => b.status === 'PENDENTE');
  const valorBoletosPendentes = boletosPendentes.reduce((acc, b) => acc + b.valor, 0);

  const propostasAtivas = propostas.filter(p => p.status === 'ATIVO');
  
  const propostasRecentes = propostas.slice(0, 5); // Últimas 5

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-4 border-b border-border">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Olá, {vendedorAtual.nome}</h2>
        <p className="text-muted-foreground">Bem-vindo ao seu painel de acompanhamento de vendas e carteira.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="metric-ativos-vendedor">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carteira Ativa</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendedorAtual.totalAtivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Clientes vinculados</p>
          </CardContent>
        </Card>
        
        <Card data-testid="metric-receita-vendedor">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita da Carteira</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatMoney(vendedorAtual.receitaTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Faturamento mensal</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-boletos-vendedor">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Boletos em Aberto</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{boletosPendentes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatMoney(valorBoletosPendentes)} no total</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-comissoes-vendedor">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minhas Comissões</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatMoney(vendedorAtual.comissaoTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Histórico total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Propostas Recentes</CardTitle>
                <CardDescription>Status das suas últimas vendas</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/vendedor/propostas" className="flex items-center gap-1 text-xs">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propostasRecentes.map(prop => (
                  <TableRow key={prop.id}>
                    <TableCell className="font-medium">
                      <div className="truncate max-w-[150px]" title={prop.clienteNome}>
                        {prop.clienteNome}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{prop.dataEnvio}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={getStatusBadgeVariant(prop.status)}>
                        {prop.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-primary/20 shadow-md shadow-primary/5">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="text-primary flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Resumo Financeiro
            </CardTitle>
            <CardDescription>Acompanhamento de repasses</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Comissões de Venda (Agenciamento)</span>
                <span className="font-medium">{formatMoney(comissoes.venda)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Comissões de Serviço (Vitalícia)</span>
                <span className="font-medium">{formatMoney(comissoes.servico)}</span>
              </div>
              <div className="pt-3 border-t flex justify-between items-center font-bold text-lg">
                <span>Total Recebido</span>
                <span className="text-primary">{formatMoney(vendedorAtual.comissaoTotal)}</span>
              </div>
            </div>

            <Button className="w-full" asChild>
              <Link href="/vendedor/comissoes">Detalhar Extrato</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
