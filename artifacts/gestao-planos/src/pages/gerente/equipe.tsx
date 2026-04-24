import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Loader2, TrendingUp, DollarSign } from "lucide-react";
import { useState } from "react";

interface Vendedor {
  id: string; nome: string; email: string; telefone?: string | null;
  comissionado: boolean; tipoComissao?: string | null;
  totalClientes: number; totalPropostas: number; comissoesPendentes: number;
}

export default function GerenteEquipe() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["gerente-vendedores"],
    queryFn: () => apiFetch("/gerente/vendedores") as Promise<{ vendedores: Vendedor[] }>,
  });

  const vendedores = (data as { vendedores: Vendedor[] } | undefined)?.vendedores ?? [];
  const filtrados = vendedores.filter(v =>
    v.nome.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalClientes = vendedores.reduce((s, v) => s + v.totalClientes, 0);
  const totalComissoes = vendedores.reduce((s, v) => s + v.comissoesPendentes, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Equipe de Vendas</h1>
        <p className="text-muted-foreground mt-1">{vendedores.length} consultores cadastrados</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Consultores</p>
              <p className="text-xl font-bold">{vendedores.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clientes na Carteira</p>
              <p className="text-xl font-bold">{totalClientes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Comissões a Pagar</p>
              <p className="text-xl font-bold">{formatMoney(totalComissoes)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar consultor..."
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
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead className="text-center">Propostas</TableHead>
                <TableHead className="text-right">Comissões Pend.</TableHead>
                <TableHead>Comissionado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nenhum consultor encontrado
                  </TableCell>
                </TableRow>
              ) : filtrados.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-semibold">{v.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{v.email}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{v.telefone ?? "—"}</TableCell>
                  <TableCell className="text-center">{v.totalClientes}</TableCell>
                  <TableCell className="text-center">{v.totalPropostas}</TableCell>
                  <TableCell className="text-right">{formatMoney(v.comissoesPendentes)}</TableCell>
                  <TableCell>
                    {v.comissionado
                      ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{v.tipoComissao ?? "SIM"}</Badge>
                      : <Badge variant="secondary">Não</Badge>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
