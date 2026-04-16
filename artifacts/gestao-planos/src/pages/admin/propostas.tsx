import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { propostas as propostasIniciais } from "@/data/propostas";
import type { Proposta } from "@/data/types";
import { formatMoney, getStatusBadgeVariant } from "@/lib/format";
import { Search, SlidersHorizontal, Upload, FileUp, CheckCircle2, X } from "lucide-react";

const statusDisponiveis = ['ATIVO', 'PENDENTE', 'EM_ANALISE', 'ENVIADO_OPERADORA', 'CANCELADO'];

export default function AdminPropostas() {
  const [propostasState, setPropostasState] = useState<Proposta[]>(propostasIniciais);
  const [search, setSearch] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const [uploadAberto, setUploadAberto] = useState(false);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'carregando' | 'concluido'>('idle');
  const [propostaEditando, setPropostaEditando] = useState<Proposta | null>(null);
  const [novoStatus, setNovoStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vendedores = useMemo(() => Array.from(new Set(propostasState.map(p => p.vendedor))), [propostasState]);
  const statuses = useMemo(() => Array.from(new Set(propostasState.map(p => p.status))), [propostasState]);

  const filteredPropostas = useMemo(() => {
    return propostasState.filter(p => {
      const matchSearch = p.clienteNome.toLowerCase().includes(search.toLowerCase()) || p.clienteCpf.includes(search);
      const matchVendedor = vendedorFilter === "TODOS" || p.vendedor === vendedorFilter;
      const matchStatus = statusFilter === "TODOS" || p.status === statusFilter;
      return matchSearch && matchVendedor && matchStatus;
    });
  }, [search, vendedorFilter, statusFilter, propostasState]);

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setArquivoSelecionado(file);
  };

  const handleUpload = () => {
    if (!arquivoSelecionado) return;
    setUploadStatus('carregando');
    setTimeout(() => {
      setUploadStatus('concluido');
    }, 1500);
  };

  const handleFecharUpload = () => {
    setUploadAberto(false);
    setArquivoSelecionado(null);
    setUploadStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAtualizarStatus = () => {
    if (!propostaEditando || !novoStatus) return;
    setPropostasState(prev =>
      prev.map(p =>
        p.id === propostaEditando.id ? { ...p, status: novoStatus as Proposta['status'] } : p
      )
    );
    setPropostaEditando(null);
    setNovoStatus("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Propostas</h2>
          <p className="text-muted-foreground">Acompanhamento do funil de vendas e envios para operadora.</p>
        </div>
        <Button
          onClick={() => setUploadAberto(true)}
          className="flex items-center gap-2 shrink-0"
          variant="outline"
          data-testid="btn-upload-propostas"
        >
          <FileUp className="h-4 w-4" />
          Atualizar Planilha
        </Button>
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
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPropostas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => { setPropostaEditando(prop); setNovoStatus(prop.status); }}
                        data-testid={`btn-editar-status-${prop.id}`}
                      >
                        Alterar Status
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Upload Planilha */}
      <Dialog open={uploadAberto} onOpenChange={handleFecharUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Atualizar Planilha de Propostas
            </DialogTitle>
            <DialogDescription>
              Envie um arquivo .xlsx ou .csv com as propostas atualizadas.
            </DialogDescription>
          </DialogHeader>

          {uploadStatus === 'concluido' ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div>
                <p className="font-semibold text-foreground">Planilha importada com sucesso!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Arquivo: <span className="font-mono text-xs">{arquivoSelecionado?.name}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Os dados serão processados e as propostas atualizadas em breve.
                </p>
              </div>
              <Button onClick={handleFecharUpload} className="mt-2">Fechar</Button>
            </div>
          ) : (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/20 ${arquivoSelecionado ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'}`}
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-upload"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleArquivo}
                  data-testid="input-file-propostas"
                />
                {arquivoSelecionado ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="h-8 w-8 text-primary" />
                    <p className="font-medium text-primary text-sm">{arquivoSelecionado.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(arquivoSelecionado.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-red-500 hover:text-red-600 gap-1"
                      onClick={(e) => { e.stopPropagation(); setArquivoSelecionado(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    >
                      <X className="h-3 w-3" /> Remover
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-muted-foreground">Clique para selecionar o arquivo</p>
                    <p className="text-xs text-muted-foreground/70">.xlsx, .xls ou .csv</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={handleFecharUpload}>Cancelar</Button>
                <Button
                  onClick={handleUpload}
                  disabled={!arquivoSelecionado || uploadStatus === 'carregando'}
                  data-testid="btn-confirmar-upload"
                >
                  {uploadStatus === 'carregando' ? 'Importando...' : 'Importar Planilha'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Status da Proposta */}
      <Dialog open={!!propostaEditando} onOpenChange={() => { setPropostaEditando(null); setNovoStatus(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Status da Proposta</DialogTitle>
            <DialogDescription>
              {propostaEditando?.clienteNome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Status atual:</p>
            <Badge variant="outline" className={getStatusBadgeVariant(propostaEditando?.status || '')}>
              {propostaEditando?.status?.replace('_', ' ')}
            </Badge>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Novo status:</label>
              <Select value={novoStatus} onValueChange={setNovoStatus}>
                <SelectTrigger data-testid="select-novo-status">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {statusDisponiveis.map(s => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPropostaEditando(null); setNovoStatus(""); }}>Cancelar</Button>
            <Button onClick={handleAtualizarStatus} disabled={!novoStatus} data-testid="btn-confirmar-status">
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
