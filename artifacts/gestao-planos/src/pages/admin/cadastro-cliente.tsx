import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Check, UserPlus, ClipboardPaste, PenLine, Sparkles, AlertCircle, RefreshCw,
  Loader2, FileSignature, Users2, Building2, User as UserIcon,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface CadastroClienteProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface FormData {
  nome: string;
  cpf: string;
  dataNascimento: string;
  sexo: string; // MASCULINO/FEMININO
  rg: string;
  rgOrgaoEmissor: string;
  rgUf: string;
  estadoCivil: string;
  nomeMae: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;

  contratoId: string;
  responsavelFinanceiroId: string;
  vendedorId: string;
  representante: string;
  planoCode: string;
  formaPagamento: string;
  diaVencimento: string;
  valorMensal: string;
  observacao: string;
  docRgUrl: string;
  docComprovanteUrl: string;
  tipo: string;
}

type CampoExtraido = { campo: keyof FormData; label: string; valor: string };

type Plano = { id: string; codigo: string; nome: string; categoria: string; valorTitular: number | string };
type ContratoOpt = { id: string; nome: string; ativo: boolean; asaasModo: "SANDBOX" | "PRODUCAO" };
type ResponsavelOpt = { id: string; nome: string; tipo: "PF" | "PJ"; cpfCnpj: string };
type VendedorOpt = { id: string; nome: string };

const formasPagamento = ["BOLETO", "PIX", "CARTAO"];
const ufs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function extrairValor(texto: string, chaves: string[]): string {
  for (const chave of chaves) {
    const regex = new RegExp(`\\*?${chave}\\*?:?\\*?\\s*(.+)`, "im");
    const match = texto.match(regex);
    if (match && match[1]) return match[1].trim().replace(/\*+/g, "").trim();
  }
  return "";
}

function formatarDataNascimento(data: string): string {
  if (!data) return "";
  const d = data.replace(/\D/g, "");
  if (d.length === 6) return `${d.slice(0,2)}/${d.slice(2,4)}/20${d.slice(4)}`;
  if (d.length === 8) return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
  return data;
}

function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  return cpf;
}

function parsearTexto(texto: string): { form: Partial<FormData>; campos: CampoExtraido[] } {
  const form: Partial<FormData> = {};
  const campos: CampoExtraido[] = [];
  const add = (campo: keyof FormData, label: string, valor: string) => {
    if (valor) { form[campo] = valor; campos.push({ campo, label, valor }); }
  };

  add("nome", "Nome", extrairValor(texto, ["Nome"]));
  const cpfRaw = extrairValor(texto, ["CPF", "Cpf"]);
  if (cpfRaw) add("cpf", "CPF", formatarCpf(cpfRaw));
  const dataNasc = extrairValor(texto, ["Data nascimento", "Data de nascimento", "Nascimento", "Data Nasc"]);
  if (dataNasc) add("dataNascimento", "Data de Nascimento", formatarDataNascimento(dataNasc));
  add("sexo", "Sexo", extrairValor(texto, ["Sexo"]).toUpperCase());

  const rg = extrairValor(texto, ["RG", "Rg"]);
  if (rg && !/^(Estado|Nome|Endereço|Bairro|Cidade)/i.test(rg)) add("rg", "RG", rg);
  add("estadoCivil", "Estado Civil", extrairValor(texto, ["Estado civil", "Estado Civil"]));
  add("nomeMae", "Nome da Mãe", extrairValor(texto, ["Nome mãe", "Nome da mãe", "Mae", "Mãe"]));
  const telefone = extrairValor(texto, ["Telefone", "Tel", "Whatsapp", "Celular", "Fone"]);
  if (telefone) add("telefone", "Telefone", telefone);
  add("email", "E-mail", extrairValor(texto, ["Email", "E-mail", "email"]).toLowerCase());
  add("logradouro", "Endereço", extrairValor(texto, ["Endereço", "Endereco", "Rua", "Avenida"]));
  add("bairro", "Bairro", extrairValor(texto, ["Bairro"]).trim());
  const cep = extrairValor(texto, ["Cep", "CEP", "C.E.P"]);
  if (cep) {
    const cepLimpo = cep.replace(/\D/g, "");
    add("cep", "CEP", cepLimpo.length === 8 ? `${cepLimpo.slice(0,5)}-${cepLimpo.slice(5)}` : cep);
  }
  add("cidade", "Cidade", extrairValor(texto, ["Cidade"]));
  const estado = extrairValor(texto, ["Estado(?!\\s+civil)"]);
  if (estado && !/divórc|solteiro|casado/i.test(estado)) {
    const ufMatch = estado.toUpperCase().match(/\b([A-Z]{2})\b/);
    add("estado", "Estado", ufMatch ? ufMatch[1] : estado.slice(0, 2).toUpperCase());
  }
  return { form, campos };
}

const formVazio: FormData = {
  nome: "", cpf: "", dataNascimento: "", sexo: "", rg: "", rgOrgaoEmissor: "", rgUf: "CE",
  estadoCivil: "", nomeMae: "", telefone: "", email: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "CE",
  contratoId: "", responsavelFinanceiroId: "", vendedorId: "", representante: "",
  planoCode: "", formaPagamento: "", diaVencimento: "", valorMensal: "",
  observacao: "", docRgUrl: "", docComprovanteUrl: "", tipo: "TITULAR",
};

type ModoEntrada = "colar" | "manual";

export default function CadastroCliente({ open, onClose, onCreated }: CadastroClienteProps) {
  const { toast } = useToast();
  const [modo, setModo] = useState<ModoEntrada>("colar");
  const [textoColar, setTextoColar] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [camposExtraidos, setCamposExtraidos] = useState<CampoExtraido[]>([]);
  const [jaAnalisou, setJaAnalisou] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<FormData>({ ...formVazio });

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [contratos, setContratos] = useState<ContratoOpt[]>([]);
  const [responsaveis, setResponsaveis] = useState<ResponsavelOpt[]>([]);
  const [vendedores, setVendedores] = useState<VendedorOpt[]>([]);

  // Carrega listas auxiliares ao abrir o modal
  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [pl, ct, rs, vd] = await Promise.all([
          apiFetch<{ planos: Plano[] }>("/planos"),
          apiFetch<{ contratos: ContratoOpt[] }>("/admin/contratos"),
          apiFetch<{ responsaveis: ResponsavelOpt[] }>("/admin/responsaveis"),
          apiFetch<{ vendedores: VendedorOpt[] }>("/admin/vendedores"),
        ]);
        setPlanos(pl.planos);
        setContratos(ct.contratos.filter(c => c.ativo));
        setResponsaveis(rs.responsaveis);
        setVendedores(vd.vendedores);
      } catch (e) {
        toast({ title: "Erro carregando dados", description: e instanceof Error ? e.message : "Falha", variant: "destructive" });
      }
    })();
  }, [open, toast]);

  const planoSelecionado = useMemo(() => planos.find(p => p.codigo === form.planoCode), [planos, form.planoCode]);
  const contratoSelecionado = useMemo(() => contratos.find(c => c.id === form.contratoId), [contratos, form.contratoId]);
  const responsavelSelecionado = useMemo(() => responsaveis.find(r => r.id === form.responsavelFinanceiroId), [responsaveis, form.responsavelFinanceiroId]);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectPlano = (codigo: string) => {
    const p = planos.find(x => x.codigo === codigo);
    setForm(prev => ({
      ...prev,
      planoCode: codigo,
      // Sugere o valor titular como mensalidade (editável)
      valorMensal: prev.valorMensal || (p ? String(p.valorTitular) : ""),
    }));
  };

  const handleSelectVendedor = (id: string) => {
    const v = vendedores.find(x => x.id === id);
    setForm(prev => ({ ...prev, vendedorId: id, representante: v?.nome ?? "" }));
  };

  const handleAnalisar = () => {
    setAnalisando(true);
    setTimeout(() => {
      const { form: dadosExtraidos, campos } = parsearTexto(textoColar);
      // sexo MASCULINO/FEMININO ja vem ok; mantemos forma humana, conv. no payload
      setForm(prev => ({ ...prev, ...dadosExtraidos }));
      setCamposExtraidos(campos);
      setJaAnalisou(true);
      setAnalisando(false);
      setStep(2);
    }, 500);
  };

  const handleLimpar = () => {
    setTextoColar("");
    setJaAnalisou(false);
    setCamposExtraidos([]);
    setForm({ ...formVazio });
    setStep(1);
  };

  const handleSalvar = async () => {
    if (!form.nome.trim() || !form.cpf.trim()) { toast({ title: "Nome e CPF obrigatórios", variant: "destructive" }); return; }
    if (!form.contratoId) { toast({ title: "Selecione o contrato", variant: "destructive" }); return; }
    if (!form.responsavelFinanceiroId) { toast({ title: "Selecione o responsável financeiro", variant: "destructive" }); return; }
    if (!form.vendedorId) { toast({ title: "Selecione o vendedor", variant: "destructive" }); return; }
    if (!form.planoCode) { toast({ title: "Selecione o plano", variant: "destructive" }); return; }
    if (!form.formaPagamento) { toast({ title: "Selecione a forma de pagamento", variant: "destructive" }); return; }
    if (!form.diaVencimento) { toast({ title: "Informe o dia de vencimento", variant: "destructive" }); return; }
    if (!form.valorMensal) { toast({ title: "Informe o valor mensal", variant: "destructive" }); return; }

    const sexoLetra = form.sexo.startsWith("M") ? "M" : form.sexo.startsWith("F") ? "F" : null;

    const payload = {
      nome: form.nome,
      cpf: form.cpf,
      dataNascimento: form.dataNascimento || null,
      sexo: sexoLetra,
      rg: form.rg || null,
      rgOrgaoEmissor: form.rgOrgaoEmissor || null,
      rgUf: form.rgUf || null,
      estadoCivil: form.estadoCivil || null,
      nomeMae: form.nomeMae || null,
      telefone: form.telefone || null,
      email: form.email || null,
      cep: form.cep || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      contratoId: form.contratoId,
      responsavelFinanceiroId: form.responsavelFinanceiroId,
      vendedorId: form.vendedorId,
      representante: form.representante || null,
      planoCode: form.planoCode,
      codigoPlano: form.planoCode,
      formaPagamento: form.formaPagamento,
      diaVencimento: Number(form.diaVencimento),
      valorMensal: form.valorMensal.replace(",", "."),
      docRgUrl: form.docRgUrl || null,
      docComprovanteUrl: form.docComprovanteUrl || null,
      tipo: form.tipo || "TITULAR",
      observacao: form.observacao || null,
    };

    setSalvando(true);
    try {
      await apiFetch("/admin/clientes", { method: "POST", body: JSON.stringify(payload) });
      toast({ title: "Cliente cadastrado com sucesso" });
      onCreated?.();
      handleFechar();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Erro ao cadastrar", description: msg, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const handleFechar = () => {
    setStep(1); setJaAnalisou(false); setTextoColar("");
    setCamposExtraidos([]); setForm({ ...formVazio });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleFechar(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Cadastro de Novo Beneficiário
          </DialogTitle>
          <DialogDescription>
            Cole os dados do cliente ou preencha manualmente. Vincule contrato, responsável financeiro e plano.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button onClick={() => setModo("colar")} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${modo === "colar" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <ClipboardPaste className="h-4 w-4" /> Colar Dados
            </button>
            <button onClick={() => setModo("manual")} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${modo === "manual" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <PenLine className="h-4 w-4" /> Digitar Manualmente
            </button>
          </div>
        )}

        {step > 1 && (
          <div className="flex items-center gap-3 py-1">
            {[
              { n: 1, t: "Dados Pessoais" },
              { n: 2, t: "Plano & Pagamento" },
              { n: 3, t: "Contrato & Responsável" },
            ].map((s, i) => {
              const stepNum = s.n + 1; // 2..4
              const cur = step + 1;
              const active = cur >= stepNum;
              return (
                <div key={s.n} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${active ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"}`}>
                    {cur > stepNum ? <Check className="h-3.5 w-3.5" /> : s.n}
                  </div>
                  <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.t}</span>
                  {i < 2 && <div className="h-px w-6 bg-muted-foreground/30" />}
                </div>
              );
            })}
          </div>
        )}

        {step === 1 && modo === "colar" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm space-y-1">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Como usar:</p>
              <p className="text-muted-foreground text-xs">
                Cole o texto da corretora abaixo. O sistema extrai nome, CPF, data, telefone, endereço e mais.
              </p>
            </div>
            <Textarea
              placeholder={`Exemplo:\nNome: ROBERTA NAYARA DE SOUSA FREITAS\nCPF: 043.332.293-40\nData nascimento: 18/08/90\nNome mãe: FRANCISCA ...\nEstado civil: DIVORCIADA\nEndereço: AVM DIOGUINHO 4200, APTO 111\nBairro: PRAIA DO FUTURO\nCep: 60183-712\nCidade: FORTALEZA\nEstado: CE\nTelefone: (85) 98809-7730`}
              value={textoColar}
              onChange={e => setTextoColar(e.target.value)}
              className="min-h-[220px] text-sm font-mono leading-relaxed resize-none"
              data-testid="textarea-colar-dados"
            />
          </div>
        )}

        {step === 1 && modo === "manual" && (
          <DadosPessoaisForm form={form} onChange={handleChange} />
        )}

        {step === 2 && (
          <div className="space-y-4">
            {jaAnalisou && camposExtraidos.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{camposExtraidos.length} campos identificados</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {camposExtraidos.map(c => (
                    <Badge key={c.campo} variant="outline" className="text-xs border-emerald-300 bg-emerald-50 text-emerald-700">
                      <Check className="h-2.5 w-2.5 mr-1" /> {c.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <DadosPessoaisForm form={form} onChange={handleChange} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            {/* Contrato */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><FileSignature className="h-4 w-4 text-primary" /> Contrato *</Label>
              <Select value={form.contratoId} onValueChange={v => handleChange("contratoId", v)}>
                <SelectTrigger data-testid="select-contrato"><SelectValue placeholder="Selecione o contrato..." /></SelectTrigger>
                <SelectContent>
                  {contratos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.asaasModo === "SANDBOX" && "(sandbox)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {contratoSelecionado && (
                <p className="text-xs text-muted-foreground">
                  Os boletos serão emitidos sob o contrato <strong>{contratoSelecionado.nome}</strong>.
                </p>
              )}
            </div>

            {/* Responsável Financeiro */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Users2 className="h-4 w-4 text-primary" /> Responsável Financeiro *</Label>
              <Select value={form.responsavelFinanceiroId} onValueChange={v => handleChange("responsavelFinanceiroId", v)}>
                <SelectTrigger data-testid="select-responsavel"><SelectValue placeholder="Quem paga este plano?" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {responsaveis.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="inline-flex items-center gap-2">
                        {r.tipo === "PJ" ? <Building2 className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
                        {r.nome} <span className="text-xs text-muted-foreground">({r.tipo})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {responsavelSelecionado && (
                <p className="text-xs text-muted-foreground">
                  Pagamento sob responsabilidade de <strong>{responsavelSelecionado.nome}</strong> ({responsavelSelecionado.tipo}).
                </p>
              )}
              {responsaveis.length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Nenhum responsável cadastrado. Vá em Responsáveis Financeiros.</p>
              )}
            </div>

            {/* Vendedor */}
            <div className="space-y-2">
              <Label>Vendedor responsável *</Label>
              <Select value={form.vendedorId} onValueChange={handleSelectVendedor}>
                <SelectTrigger data-testid="select-vendedor"><SelectValue placeholder="Selecione o vendedor..." /></SelectTrigger>
                <SelectContent>
                  {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Plano */}
            <div className="space-y-2">
              <Label>Plano *</Label>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {planos.map(p => {
                  const valor = typeof p.valorTitular === "string" ? Number(p.valorTitular) : p.valorTitular;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPlano(p.codigo)}
                      className={`p-3 rounded-lg border text-left transition-all ${form.planoCode === p.codigo ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
                    >
                      <div className="font-mono font-bold text-sm">{p.codigo}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">{p.nome}</div>
                      <div className="text-xs font-semibold text-primary mt-1">R$ {valor.toFixed(2).replace(".", ",")}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pagamento */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Forma de Pagamento *</Label>
                <Select value={form.formaPagamento} onValueChange={v => handleChange("formaPagamento", v)}>
                  <SelectTrigger data-testid="select-forma-pagamento"><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dia Vencimento *</Label>
                <Input type="number" min={1} max={31} value={form.diaVencimento} onChange={e => handleChange("diaVencimento", e.target.value)} placeholder="10" />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Mensal (R$) *</Label>
                <Input value={form.valorMensal} onChange={e => handleChange("valorMensal", e.target.value)} placeholder="0,00" />
              </div>
            </div>

            {/* Tipo + docs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo do beneficiário</Label>
                <Select value={form.tipo} onValueChange={v => handleChange("tipo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TITULAR">TITULAR</SelectItem>
                    <SelectItem value="DEPENDENTE">DEPENDENTE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>URL do RG (digitalizado)</Label>
                <Input value={form.docRgUrl} onChange={e => handleChange("docRgUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>URL do Comprovante de Residência</Label>
                <Input value={form.docComprovanteUrl} onChange={e => handleChange("docComprovanteUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Observação</Label>
                <Textarea value={form.observacao} onChange={e => handleChange("observacao", e.target.value)} rows={2} className="resize-none" />
              </div>
            </div>
          </div>
        )}

        {/* Footer dinâmico */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>Voltar</Button>
            )}
            {(step === 1 || step === 2) && (
              <Button variant="outline" onClick={handleLimpar} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Limpar</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleFechar}>Cancelar</Button>
            {step === 1 && modo === "colar" && (
              <Button onClick={handleAnalisar} disabled={!textoColar.trim() || analisando} className="gap-1.5">
                {analisando ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</> : <><Sparkles className="h-4 w-4" /> Analisar</>}
              </Button>
            )}
            {step === 1 && modo === "manual" && (
              <Button onClick={() => setStep(2)}>Próximo</Button>
            )}
            {step === 2 && <Button onClick={() => setStep(3)}>Próximo</Button>}
            {step === 3 && (
              <Button onClick={() => void handleSalvar()} disabled={salvando} data-testid="btn-salvar-cliente" className="gap-1.5">
                {salvando ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Check className="h-4 w-4" /> Cadastrar</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DadosPessoaisForm({ form, onChange }: { form: FormData; onChange: (f: keyof FormData, v: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 text-sm">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Nome Completo *</Label>
        <Input value={form.nome} onChange={e => onChange("nome", e.target.value)} data-testid="input-nome-cliente" />
      </div>
      <div className="space-y-1.5">
        <Label>CPF *</Label>
        <Input value={form.cpf} onChange={e => onChange("cpf", e.target.value)} className="font-mono" data-testid="input-cpf-cliente" />
      </div>
      <div className="space-y-1.5">
        <Label>Data Nasc.</Label>
        <Input value={form.dataNascimento} onChange={e => onChange("dataNascimento", e.target.value)} placeholder="DD/MM/AAAA" />
      </div>
      <div className="space-y-1.5">
        <Label>Sexo</Label>
        <Select value={form.sexo} onValueChange={v => onChange("sexo", v)}>
          <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MASCULINO">Masculino</SelectItem>
            <SelectItem value="FEMININO">Feminino</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Estado Civil</Label>
        <Select value={form.estadoCivil} onValueChange={v => onChange("estadoCivil", v)}>
          <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
            <SelectItem value="CASADO">Casado(a)</SelectItem>
            <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
            <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
            <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>RG</Label>
        <Input value={form.rg} onChange={e => onChange("rg", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Órgão Emissor</Label>
        <Input value={form.rgOrgaoEmissor} onChange={e => onChange("rgOrgaoEmissor", e.target.value)} placeholder="SSP" />
      </div>
      <div className="space-y-1.5">
        <Label>UF do RG</Label>
        <Select value={form.rgUf} onValueChange={v => onChange("rgUf", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            {ufs.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Nome da Mãe</Label>
        <Input value={form.nomeMae} onChange={e => onChange("nomeMae", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Telefone</Label>
        <Input value={form.telefone} onChange={e => onChange("telefone", e.target.value)} placeholder="(85) 99999-9999" />
      </div>
      <div className="space-y-1.5">
        <Label>E-mail</Label>
        <Input type="email" value={form.email} onChange={e => onChange("email", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>CEP</Label>
        <Input value={form.cep} onChange={e => onChange("cep", e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-1">
        <Label>Logradouro</Label>
        <Input value={form.logradouro} onChange={e => onChange("logradouro", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Número</Label>
        <Input value={form.numero} onChange={e => onChange("numero", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Complemento</Label>
        <Input value={form.complemento} onChange={e => onChange("complemento", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Bairro</Label>
        <Input value={form.bairro} onChange={e => onChange("bairro", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Cidade</Label>
        <Input value={form.cidade} onChange={e => onChange("cidade", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>UF</Label>
        <Select value={form.estado} onValueChange={v => onChange("estado", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            {ufs.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
