import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";

interface Cliente {
  id: string; nome: string; cpf?: string | null; telefone?: string | null;
  email?: string | null; cidade?: string | null; estado?: string | null;
  valorMensal?: string | null; tipo: string; status: string;
  representante?: string | null; planoCode?: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  ATIVO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELADO: "bg-red-100 text-red-700 border-red-200",
  SUSPENSO: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function GerenteClientes() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["gerente-clientes"],
    queryFn: () => apiFetch("/gerente/clientes") as Promise<{ clientes: Cliente[] }>,
  });

  const clientes = (data as { clientes: Cliente[] } | undefined)?.clientes ?? [];
  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf ?? "").includes(search) ||
    (c.telefone ?? "").includes(search) ||
    (c.representante ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const ativos = clientes.filter(c => c.status === "ATIVO").length;
  const titulares = filtrados.filter(c => c.tipo === "TITULAR").length;
  const dependentes = filtrados.filter(c => c.tipo === "DEPENDENTE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground mt-1">{ativos} clientes ativos na carteira</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF, telefone ou consultor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{titulares}</span> titulares ·
          <span className="font-semibold text-foreground">{dependentes}</span> dependentes
        </div>
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
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Consultor</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : filtrados.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.cpf ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.telefone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.cidade && c.estado ? `${c.cidade}/${c.estado}` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.representante || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.planoCode ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(parseFloat(c.valorMensal ?? "0"))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={c.tipo === "TITULAR" ? "border-blue-300 text-blue-700" : "border-slate-300"}>
                      {c.tipo === "TITULAR" ? "Titular" : "Dep."}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[c.status] ?? ""}>{c.status}</Badge>
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
