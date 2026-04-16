import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCobrancasByVendedor } from "@/data/cobranca";
import { vendedorAtual } from "@/data/vendedores";
import { formatMoney } from "@/lib/format";
import { Search, MessageCircle, AlertTriangle, Clock } from "lucide-react";
import { WhatsappModal } from "@/components/whatsapp-modal";
import type { RegistroCobranca } from "@/data/cobranca";

function badgeCobranca(status: string) {
  if (status === 'VENCIDO') return 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/20';
  if (status === 'PENDENTE') return 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/20';
  if (status === 'CANCELAR') return 'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/20';
  return '';
}

function labelStatus(status: string) {
  if (status === 'VENCIDO') return 'Vencido';
  if (status === 'PENDENTE') return 'Pendente';
  if (status === 'CANCELAR') return 'A Cancelar';
  return status;
}

export default function VendedorCobranca() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [modalAberto, setModalAberto] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState<RegistroCobranca | null>(null);

  const meusRegistros = getCobrancasByVendedor(vendedorAtual.nome);

  const filtrados = useMemo(() => {
    return meusRegistros.filter(r => {
      const matchSearch = r.clienteNome.toLowerCase().includes(search.toLowerCase()) ||
        r.clienteCpf.includes(search);
      const matchStatus = statusFilter === 'TODOS' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter, meusRegistros]);

  const totalPendente = meusRegistros.filter(r => r.status === 'PENDENTE').reduce((a, r) => a + r.valor, 0);
  const totalVencido = meusRegistros.filter(r => r.status === 'VENCIDO').reduce((a, r) => a + r.valor, 0);

  const handleAbrirWhatsapp = (registro: RegistroCobranca) => {
    setRegistroSelecionado(registro);
    setModalAberto(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Minha Cobrança</h2>
        <p className="text-muted-foreground">Clientes com boletos em aberto ou vencidos na sua carteira.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500" /> Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {meusRegistros.filter(r => r.status === 'PENDENTE').length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{formatMoney(totalPendente)} a receber</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-50/30 dark:bg-red-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" /> Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {meusRegistros.filter(r => r.status === 'VENCIDO').length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{formatMoney(totalVencido)} em atraso</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou CPF..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-search-cobranca-vendedor"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44" data-testid="select-status-cobranca-vendedor">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Mês Ref.</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">WhatsApp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map(registro => (
                <TableRow key={registro.id} data-testid={`row-cob-vendedor-${registro.id}`} className="hover:bg-muted/20">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{registro.clienteNome}</span>
                      <span className="text-xs text-muted-foreground font-mono">{registro.clienteCpf}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{registro.plano}</TableCell>
                  <TableCell className="text-sm">{registro.mesReferencia}</TableCell>
                  <TableCell className="text-sm">{registro.vencimento}</TableCell>
                  <TableCell className="text-right font-bold">{formatMoney(registro.valor)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={badgeCobranca(registro.status)}>
                      {labelStatus(registro.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-500 dark:border-green-700 dark:text-green-400"
                      onClick={() => handleAbrirWhatsapp(registro)}
                      data-testid={`btn-whatsapp-vendedor-${registro.id}`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {registroSelecionado && (
        <WhatsappModal
          open={modalAberto}
          onClose={() => { setModalAberto(false); setRegistroSelecionado(null); }}
          clienteNome={registroSelecionado.clienteNome}
          telefone={registroSelecionado.telefone}
          valor={registroSelecionado.valor}
          mesReferencia={registroSelecionado.mesReferencia}
          vencimento={registroSelecionado.vencimento}
        />
      )}
    </div>
  );
}
