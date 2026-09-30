import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Beneficiario = { id: string; nome: string; cpf: string; status: string; tipo: string; valorMensal: string | null };
type Boleto = {
  id: string; clienteId: string; valor: string; vencimento: string; status: string;
  mesReferencia: string; linkPagamento?: string | null; codigoBarras?: string | null;
};
type Resposta = {
  responsavel: { id: string; nome: string; cpfCnpj: string; email: string | null };
  beneficiarios: Beneficiario[];
  boletos: Boleto[];
};

const fmtData = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
const fmtMoeda = (v: string | null) => (v ? `R$ ${parseFloat(v).toFixed(2).replace(".", ",")}` : "—");

export default function ResponsavelPainel() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    apiFetch<Resposta>("/responsavel/me").then(setDados).catch(e => setErro(e instanceof Error ? e.message : String(e)));
  }, []);

  if (erro) return (
    <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="h-4 w-4" />{erro}</div>
  );
  if (!dados) return <div className="flex justify-center h-40 items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const nomeDe = (id: string) => dados.beneficiarios.find(b => b.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6" data-testid="painel-responsavel">
      <div className="pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight">Olá, {dados.responsavel.nome}</h2>
        <p className="text-muted-foreground">Beneficiários sob sua responsabilidade financeira e suas faturas.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Beneficiários ({dados.beneficiarios.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {dados.beneficiarios.length === 0 && <p className="text-sm text-muted-foreground">Nenhum beneficiário vinculado ainda.</p>}
          {dados.beneficiarios.map(b => (
            <div key={b.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
              <span className="font-medium">{b.nome}</span>
              <span className="flex items-center gap-3">
                <span className="text-muted-foreground">{fmtMoeda(b.valorMensal)}</span>
                <Badge variant="outline">{b.status}</Badge>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Faturas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {dados.boletos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada.</p>}
          {dados.boletos.map(b => (
            <div key={b.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
              <span>
                <span className="font-medium">{nomeDe(b.clienteId)}</span>
                <span className="text-muted-foreground"> · {b.mesReferencia} · vence {fmtData(b.vencimento)}</span>
              </span>
              <span className="flex items-center gap-3">
                <span>{fmtMoeda(b.valor)}</span>
                <Badge variant="outline">{b.status}</Badge>
                {b.linkPagamento && b.status !== "PAGO" && (
                  <a href={b.linkPagamento} target="_blank" rel="noreferrer" className="text-primary underline">Pagar</a>
                )}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
