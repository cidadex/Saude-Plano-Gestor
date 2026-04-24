import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";
import { HeartPulse, User, Users, MapPin, Phone, Mail, Calendar, CreditCard, FileText, AlertCircle, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PlanoInfo = { id: string; nome: string; codigo: string | null; tipo: string; operadora: string };
type DependenteInfo = { id: string; nome: string; cpf?: string | null; dataNascimento?: string | null; grauParentesco?: string | null; valorMensal?: string | null };
type ClienteInfo = {
  id: string; nome: string; cpf: string; dataNascimento?: string | null; sexo?: string | null;
  telefone?: string | null; email?: string | null;
  logradouro?: string | null; numero?: string | null; bairro?: string | null; cidade?: string | null; estado?: string | null;
  status: string; valorMensal?: string | null; dataVigencia?: string | null; dataAtivacao?: string | null;
  diaVencimento?: number | null; formaPagamento?: string | null; codigoPlano?: string | null;
};
type BoletoResumido = { id: string; valor: string; vencimento: string; status: string; mesReferencia: string };

const STATUS_CONTRATO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ATIVO: { label: "Ativo", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  SUSPENSO: { label: "Suspenso", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  CANCELADO: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const GRAU_LABEL: Record<string, string> = {
  CONJUGE: "Cônjuge", FILHO: "Filho(a)", FILHA: "Filha", PAI: "Pai", MAE: "Mãe",
  IRMAO: "Irmão", IRMA: "Irmã", OUTRO: "Outro",
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}
function formatMoney(v?: string | null) {
  if (!v) return "—";
  return `R$ ${parseFloat(v).toFixed(2).replace(".", ",")}`;
}

export default function ClienteDashboard() {
  const [cliente, setCliente] = useState<ClienteInfo | null>(null);
  const [plano, setPlano] = useState<PlanoInfo | null>(null);
  const [dependentes, setDependentes] = useState<DependenteInfo[]>([]);
  const [proximoBoleto, setProximoBoleto] = useState<BoletoResumido | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/cliente/me") as Promise<{ cliente: ClienteInfo; plano: PlanoInfo | null; dependentes: DependenteInfo[] }>,
      apiFetch("/cliente/boletos") as Promise<{ boletos: BoletoResumido[] }>,
    ]).then(([me, bol]) => {
      setCliente(me.cliente);
      setPlano(me.plano);
      setDependentes(me.dependentes ?? []);
      const pendentes = (bol.boletos ?? []).filter(b => b.status === "PENDENTE");
      if (pendentes.length > 0) setProximoBoleto(pendentes[0]);
    }).catch(err => setErro(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
    </div>
  );

  if (erro) return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
      <AlertCircle className="h-5 w-5 shrink-0" />
      <span className="text-sm">{erro}</span>
    </div>
  );

  const contratoStatus = cliente?.status ? STATUS_CONTRATO[cliente.status] ?? STATUS_CONTRATO["ATIVO"] : STATUS_CONTRATO["ATIVO"];
  const StatusIcon = contratoStatus.icon;

  return (
    <div className="space-y-5">
      {/* Boas-vindas */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Olá, {cliente?.nome?.split(" ")[0]} 👋</h1>
        <p className="text-slate-500 text-sm mt-0.5">Bem-vindo ao seu portal de saúde.</p>
      </div>

      {/* Próximo vencimento (destaque) */}
      {proximoBoleto && (
        <div className="rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 p-5 text-white shadow-lg shadow-rose-200">
          <p className="text-rose-100 text-xs font-medium uppercase tracking-wide mb-1">Próximo vencimento</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold">{formatMoney(proximoBoleto.valor)}</p>
              <p className="text-rose-100 text-sm mt-0.5">Ref. {proximoBoleto.mesReferencia} · Vence {formatDate(proximoBoleto.vencimento)}</p>
            </div>
            <Link href="/cliente/faturas">
              <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0">
                <FileText className="h-4 w-4 mr-1" /> Ver fatura
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Cards — Plano e Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Plano */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-rose-500" /> Seu Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plano ? (
              <>
                <p className="font-bold text-slate-800 leading-snug">{plano.nome}</p>
                <div className="flex flex-wrap gap-2">
                  {plano.codigo && <Badge variant="outline" className="font-mono text-xs">{plano.codigo}</Badge>}
                  <Badge variant="outline" className="text-xs">{plano.operadora}</Badge>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-sm">{cliente?.codigoPlano ? `Código: ${cliente.codigoPlano}` : "Plano não informado"}</p>
            )}
            <div className="pt-1 flex items-center gap-2">
              <p className="text-xs text-slate-500">Mensalidade:</p>
              <p className="font-bold text-rose-600">{formatMoney(cliente?.valorMensal)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Status + datas */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-slate-400" /> Status do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${contratoStatus.color}`}>
              <StatusIcon className="h-4 w-4" />
              {contratoStatus.label}
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-sm">
              {cliente?.dataAtivacao && (
                <>
                  <span className="text-slate-400">Ativação:</span>
                  <span className="font-medium">{formatDate(cliente.dataAtivacao)}</span>
                </>
              )}
              {cliente?.dataVigencia && (
                <>
                  <span className="text-slate-400">Vigência:</span>
                  <span className="font-medium">{formatDate(cliente.dataVigencia)}</span>
                </>
              )}
              {cliente?.diaVencimento && (
                <>
                  <span className="text-slate-400">Vencimento:</span>
                  <span className="font-medium">Dia {cliente.diaVencimento}</span>
                </>
              )}
              {cliente?.formaPagamento && (
                <>
                  <span className="text-slate-400">Pagamento:</span>
                  <span className="font-medium">{cliente.formaPagamento}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dependentes */}
      {dependentes.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" /> Dependentes ({dependentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {dependentes.map(dep => (
                <div key={dep.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{dep.nome}</p>
                    {dep.dataNascimento && (
                      <p className="text-xs text-slate-400">{formatDate(dep.dataNascimento)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {dep.valorMensal && <span className="text-xs font-semibold text-rose-600">{formatMoney(dep.valorMensal)}</span>}
                    {dep.grauParentesco && (
                      <Badge variant="outline" className="text-xs">{GRAU_LABEL[dep.grauParentesco] ?? dep.grauParentesco}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dados cadastrais */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" /> Seus Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">CPF</p>
                <p className="font-medium font-mono">{cliente?.cpf ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Nascimento</p>
                <p className="font-medium">{formatDate(cliente?.dataNascimento)}</p>
              </div>
            </div>
            {cliente?.telefone && (
              <div className="flex items-start gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Telefone</p>
                  <p className="font-medium">{cliente.telefone}</p>
                </div>
              </div>
            )}
            {cliente?.email && (
              <div className="flex items-start gap-2 text-sm">
                <Mail className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">E-mail</p>
                  <p className="font-medium">{cliente.email}</p>
                </div>
              </div>
            )}
            {(cliente?.logradouro || cliente?.cidade) && (
              <div className="flex items-start gap-2 text-sm sm:col-span-2">
                <MapPin className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Endereço</p>
                  <p className="font-medium">
                    {[cliente.logradouro, cliente.numero && `nº ${cliente.numero}`, cliente.bairro, `${cliente.cidade ?? ""}${cliente.estado ? `/${cliente.estado}` : ""}`]
                      .filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
