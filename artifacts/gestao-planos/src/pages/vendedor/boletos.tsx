import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBoletos, type BoletoAPI } from "@/hooks/useVendedorData";
import { formatMoney } from "@/lib/format";
import { Search, Receipt, Calendar, FileWarning, MessageCircle, Loader2 } from "lucide-react";
import { WhatsappModal } from "@/components/whatsapp-modal";

function statusColor(status: string) {
  if (status === "PAGO") return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (status === "VENCIDO") return "border-red-300 bg-red-50 text-red-700";
  if (status === "PENDENTE") return "border-amber-300 bg-amber-50 text-amber-700";
  return "";
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function VendedorBoletos() {
  const { boletos, loading } = useBoletos();
  const [search, setSearch] = useState("");
  const [mesFilter, setMesFilter] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [whatsappAberto, setWhatsappAberto] = useState(false);
  const [boletoSelecionado, setBoletoSelecionado] = useState<BoletoAPI | null>(null);

  const meses = useMemo(() => Array.from(new Set(boletos.map(b => b.mesReferencia))), [boletos]);
  const statuses = useMemo(() => Array.from(new Set(boletos.map(b => b.status))), [boletos]);

  const filteredBoletos = useMemo(() => boletos.filter(b => {
    const matchSearch = b.clienteNome.toLowerCase().includes(search.toLowerCase()) || b.clienteCpf.includes(search);
    const matchMes = mesFilter === "TODOS" || b.mesReferencia === mesFilter;
    const matchStatus = statusFilter === "TODOS" || b.status === statusFilter;
    return matchSearch && matchMes && matchStatus;
  }), [search, mesFilter, statusFilter, boletos]);

  const totais = useMemo(() => ({
    pendente: boletos.filter(b => b.status === "PENDENTE").reduce((a, b) => a + parseFloat(b.valor), 0),
    pago: boletos.filter(b => b.status === "PAGO").reduce((a, b) => a + parseFloat(b.valor), 0),
    vencido: boletos.filter(b => b.status === "VENCIDO").reduce((a, b) => a + parseFloat(b.valor), 0),
  }), [boletos]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Controle de Boletos</h2>
        <p className="text-muted-foreground">Acompanhe a inadimplência e faturamento da sua carteira.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" /> A Vencer (Pendentes)
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{formatMoney(totais.pendente)}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-50/50 dark:bg-red-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700 dark:text-red-400">
              <FileWarning className="h-4 w-4" /> Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600 dark:text-red-500">{formatMoney(totais.vencido)}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Receipt className="h-4 w-4" /> Pagos Recebidos
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{formatMoney(totais.pago)}</div></CardContent>
        </Card>
      </div>

      <Card className="mt-8 border shadow-sm">
        <CardHeader className="bg-muted/10 pb-4 border-b">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Faturas Emitidas</CardTitle>
              <CardDescription>Busque por clientes específicos ou filtre por mês</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar cliente..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={mesFilter} onValueChange={setMesFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="Mês Ref." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os meses</SelectItem>
                  {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos status</SelectItem>
                  {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Vencimento</TableHead>
              <TableHead>Mês Ref.</TableHead>
              <TableHead>Cliente / CPF</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBoletos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p>Nenhum boleto encontrado.</p>
                </TableCell>
              </TableRow>
            ) : filteredBoletos.map(boleto => (
              <TableRow key={boleto.id} className="hover:bg-muted/30">
                <TableCell className="font-semibold text-foreground">{formatDate(boleto.vencimento)}</TableCell>
                <TableCell className="text-muted-foreground">{boleto.mesReferencia}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{boleto.clienteNome}</span>
                    <span className="text-xs text-muted-foreground font-mono">{boleto.clienteCpf}</span>
                  </div>
                </TableCell>
                <TableCell className="font-bold text-right text-foreground">{formatMoney(parseFloat(boleto.valor))}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={statusColor(boleto.status)}>{boleto.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {boleto.codigoBarras && (
                      <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => { navigator.clipboard.writeText(boleto.codigoBarras ?? "").catch(() => {}); }}>
                        Ver Código
                      </Button>
                    )}
                    <Button variant="outline" size="sm"
                      className="h-8 gap-1 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-500 dark:border-green-700 dark:text-green-400"
                      onClick={() => { setBoletoSelecionado(boleto); setWhatsappAberto(true); }}
                      data-testid={`btn-whatsapp-boleto-${boleto.id}`}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {boletoSelecionado && (
        <WhatsappModal
          open={whatsappAberto}
          onClose={() => { setWhatsappAberto(false); setBoletoSelecionado(null); }}
          clienteNome={boletoSelecionado.clienteNome}
          telefone={boletoSelecionado.clienteTelefone ?? "(85) 99999-0000"}
          valor={parseFloat(boletoSelecionado.valor)}
          mesReferencia={boletoSelecionado.mesReferencia}
          vencimento={formatDate(boletoSelecionado.vencimento)}
          clienteId={boletoSelecionado.clienteId}
          boletoId={boletoSelecionado.id}
        />
      )}
    </div>
  );
}
