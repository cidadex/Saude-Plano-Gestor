import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, UserPlus, ClipboardPaste, PenLine, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { vendedores } from "@/data/vendedores";
import { planos } from "@/data/planos";

interface CadastroClienteProps {
  open: boolean;
  onClose: () => void;
}

interface FormData {
  nome: string;
  cpf: string;
  dataNascimento: string;
  sexo: string;
  rg: string;
  estadoCivil: string;
  nomeMae: string;
  telefone: string;
  email: string;
  endereco: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  tipo: string;
  responsavel: string;
  representante: string;
  plano: string;
  formaPagamento: string;
  vencimento: string;
  observacao: string;
  obstetricia: string;
}

type CampoExtraido = { campo: keyof FormData; label: string; valor: string };

const formasPagamento = ['BOLETO', 'CORA', 'C6', 'BTG', 'PIX', 'DÉBITO EM FOLHA'];
const diasVencimento = ['1', '5', '10', '15', '20', '25', '30'];

const mapaPlanos: Record<string, string> = {
  'nosso plano': '5252',
  'mix': '5254',
  'pleno': '5285',
  'basic': '5254',
  '5252': '5252',
  '5254': '5254',
  '5285': '5285',
};

function extrairValor(texto: string, chaves: string[]): string {
  for (const chave of chaves) {
    const regex = new RegExp(`\\*?${chave}\\*?:?\\*?\\s*(.+)`, 'im');
    const match = texto.match(regex);
    if (match && match[1]) {
      return match[1].trim().replace(/\*+/g, '').trim();
    }
  }
  return '';
}

function formatarDataNascimento(data: string): string {
  if (!data) return '';
  const d = data.replace(/\D/g, '');
  if (d.length === 6) {
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  }
  if (d.length === 8) {
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  }
  return data;
}

function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  return cpf;
}

function parsearTexto(texto: string): { form: Partial<FormData>; campos: CampoExtraido[] } {
  const form: Partial<FormData> = {};
  const campos: CampoExtraido[] = [];

  const add = (campo: keyof FormData, label: string, valor: string) => {
    if (valor) {
      form[campo] = valor;
      campos.push({ campo, label, valor });
    }
  };

  const nome = extrairValor(texto, ['Nome']);
  add('nome', 'Nome', nome);

  const cpfRaw = extrairValor(texto, ['CPF', 'Cpf']);
  if (cpfRaw) add('cpf', 'CPF', formatarCpf(cpfRaw));

  const dataNasc = extrairValor(texto, ['Data nascimento', 'Data de nascimento', 'Nascimento', 'Data Nasc']);
  if (dataNasc) add('dataNascimento', 'Data de Nascimento', formatarDataNascimento(dataNasc));

  const sexo = extrairValor(texto, ['Sexo']);
  add('sexo', 'Sexo', sexo);

  const rg = extrairValor(texto, ['RG', 'Rg']);
  if (rg && rg.trim() !== '' && !/^(Estado|Nome|Endereço|Bairro|Cidade)/i.test(rg)) {
    add('rg', 'RG', rg);
  }

  const estadoCivil = extrairValor(texto, ['Estado civil', 'Estado Civil']);
  add('estadoCivil', 'Estado Civil', estadoCivil);

  const nomeMae = extrairValor(texto, ['Nome mãe', 'Nome da mãe', 'Mae', 'Mãe']);
  add('nomeMae', 'Nome da Mãe', nomeMae);

  const telefone = extrairValor(texto, ['Telefone', 'Tel', 'Whatsapp', 'Celular', 'Fone']);
  if (telefone) add('telefone', 'Telefone', telefone.replace(/\./g, ''));

  const email = extrairValor(texto, ['Email', 'E-mail', 'email']);
  add('email', 'E-mail', email.toLowerCase());

  const endereco = extrairValor(texto, ['Endereço', 'Endereco', 'Rua', 'Avenida', 'Av']);
  add('endereco', 'Endereço', endereco);

  const bairro = extrairValor(texto, ['Bairro']);
  add('bairro', 'Bairro', bairro.trim());

  const cep = extrairValor(texto, ['Cep', 'CEP', 'C.E.P']);
  if (cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    add('cep', 'CEP', cepLimpo.length === 8 ? `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}` : cep);
  }

  const cidade = extrairValor(texto, ['Cidade']);
  add('cidade', 'Cidade', cidade);

  const estado = extrairValor(texto, ['Estado(?!\\s+civil)']);
  if (estado && !/divórc|solteiro|casado/i.test(estado)) {
    add('estado', 'Estado', estado);
  }

  const planoTexto = extrairValor(texto, ['Plano', 'plano']);
  if (planoTexto) {
    const chave = planoTexto.toLowerCase().replace(/hapvida\s*/i, '').trim();
    const codigoMapeado = Object.entries(mapaPlanos).find(([k]) => chave.includes(k))?.[1];
    if (codigoMapeado) {
      form['plano'] = codigoMapeado;
      campos.push({ campo: 'plano', label: 'Plano', valor: `${codigoMapeado} (${planoTexto})` });
    } else {
      add('observacao', 'Plano (manual)', planoTexto);
    }
  }

  const obs = extrairValor(texto, ['Obstetrícia', 'Obstetricia', 'Obstetrica']);
  if (obs) add('obstetricia', 'Obstetrícia', obs);

  return { form, campos };
}

const formVazio: FormData = {
  nome: '', cpf: '', dataNascimento: '', sexo: '', rg: '', estadoCivil: '',
  nomeMae: '', telefone: '', email: '', endereco: '', bairro: '', cep: '',
  cidade: '', estado: 'CE', tipo: 'TITULAR', responsavel: '', representante: '',
  plano: '', formaPagamento: '', vencimento: '', observacao: '', obstetricia: '',
};

type ModoEntrada = 'colar' | 'manual';

export default function CadastroCliente({ open, onClose }: CadastroClienteProps) {
  const [modo, setModo] = useState<ModoEntrada>('colar');
  const [textoColar, setTextoColar] = useState('');
  const [analisando, setAnalisando] = useState(false);
  const [camposExtraidos, setCamposExtraidos] = useState<CampoExtraido[]>([]);
  const [jaAnalisou, setJaAnalisou] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [salvo, setSalvo] = useState(false);
  const [form, setForm] = useState<FormData>({ ...formVazio });

  const handleChange = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAnalisar = () => {
    setAnalisando(true);
    setTimeout(() => {
      const { form: dadosExtraidos, campos } = parsearTexto(textoColar);
      setForm(prev => ({ ...prev, ...dadosExtraidos }));
      setCamposExtraidos(campos);
      setJaAnalisou(true);
      setAnalisando(false);
      setStep(2);
    }, 900);
  };

  const handleLimpar = () => {
    setTextoColar('');
    setJaAnalisou(false);
    setCamposExtraidos([]);
    setForm({ ...formVazio });
    setStep(1);
  };

  const handleSalvar = () => {
    setSalvo(true);
    setTimeout(() => {
      setSalvo(false);
      setStep(1);
      setForm({ ...formVazio });
      setTextoColar('');
      setJaAnalisou(false);
      setCamposExtraidos([]);
      onClose();
    }, 1500);
  };

  const handleFechar = () => {
    setStep(1);
    setSalvo(false);
    setJaAnalisou(false);
    setTextoColar('');
    setCamposExtraidos([]);
    setForm({ ...formVazio });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Cadastro de Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Cole o texto com os dados do cliente ou preencha manualmente.
          </DialogDescription>
        </DialogHeader>

        {/* Seletor de modo — só na etapa 1 */}
        {step === 1 && (
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setModo('colar')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${modo === 'colar' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              data-testid="btn-modo-colar"
            >
              <ClipboardPaste className="h-4 w-4" /> Colar Dados
            </button>
            <button
              onClick={() => setModo('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${modo === 'manual' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              data-testid="btn-modo-manual"
            >
              <PenLine className="h-4 w-4" /> Digitar Manualmente
            </button>
          </div>
        )}

        {/* Indicador de progresso — etapas 2 e 3 */}
        {step > 1 && (
          <div className="flex items-center gap-2 py-1">
            {[2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  step >= s ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'
                }`}>
                  {step > s ? <Check className="h-3.5 w-3.5" /> : s === 2 ? '1' : '2'}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s === 2 ? 'Dados Extraídos' : 'Plano & Confirmação'}
                </span>
                {s < 3 && <div className="h-px w-8 bg-muted-foreground/30" />}
              </div>
            ))}
          </div>
        )}

        {/* ETAPA 1 — Colar dados */}
        {step === 1 && modo === 'colar' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Como usar:
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Copie o texto com as informações do cliente (no formato da corretora) e cole abaixo.
                O sistema identifica automaticamente: nome, CPF, data de nascimento, telefone, endereço, plano e mais.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Cole o texto com os dados:</Label>
              <Textarea
                placeholder={`Exemplo:\nNome: ROBERTA NAYARA DE SOUSA FREITAS\nSexo: FEMININO\nCPF: 043.332.293-40\nData nascimento: 18/08/90\nNome mãe: FRANCISCA DA NATIVIDADE DE SOUSA\nEstado civil: DIVORCIADA\nEndereço: AVM DIOGUINHO 4200, APTO 111 BLOCO I\nBairro: PRAIA DO FUTURO\nCep: 60183-712\nCidade: FORTALEZA\nEstado: CEARÁ\nTelefone: (85) 98809-7730\nEmail: email@exemplo.com\nPlano: NOSSO PLANO\nObstetrícia: sim`}
                value={textoColar}
                onChange={e => setTextoColar(e.target.value)}
                className="min-h-[220px] text-sm font-mono leading-relaxed resize-none"
                data-testid="textarea-colar-dados"
              />
            </div>
          </div>
        )}

        {/* ETAPA 1 — Preenchimento manual */}
        {step === 1 && modo === 'manual' && (
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome Completo *</Label>
                <Input placeholder="Nome do beneficiário" value={form.nome} onChange={e => handleChange('nome', e.target.value)} data-testid="input-nome-cliente" />
              </div>
              <div className="space-y-1.5">
                <Label>CPF *</Label>
                <Input placeholder="000.000.000-00" value={form.cpf} onChange={e => handleChange('cpf', e.target.value)} data-testid="input-cpf-cliente" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Nascimento</Label>
                <Input placeholder="DD/MM/AAAA" value={form.dataNascimento} onChange={e => handleChange('dataNascimento', e.target.value)} data-testid="input-data-nasc" />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select value={form.sexo} onValueChange={v => handleChange('sexo', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASCULINO">Masculino</SelectItem>
                    <SelectItem value="FEMININO">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>RG</Label>
                <Input placeholder="Número do RG" value={form.rg} onChange={e => handleChange('rg', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado Civil</Label>
                <Input placeholder="Solteiro(a), Casado(a)..." value={form.estadoCivil} onChange={e => handleChange('estadoCivil', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone / WhatsApp</Label>
                <Input placeholder="(85) 99999-9999" value={form.telefone} onChange={e => handleChange('telefone', e.target.value)} data-testid="input-telefone-cliente" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input placeholder="email@exemplo.com" value={form.email} onChange={e => handleChange('email', e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Endereço</Label>
                <Input placeholder="Rua, número, complemento" value={form.endereco} onChange={e => handleChange('endereco', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Bairro</Label>
                <Input placeholder="Bairro" value={form.bairro} onChange={e => handleChange('bairro', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input placeholder="00000-000" value={form.cep} onChange={e => handleChange('cep', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input placeholder="Fortaleza" value={form.cidade} onChange={e => handleChange('cidade', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input placeholder="CE" value={form.estado} onChange={e => handleChange('estado', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 2 — Dados extraídos + seleção de plano */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Resumo dos campos extraídos */}
            {jaAnalisou && camposExtraidos.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {camposExtraidos.length} campos identificados automaticamente
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {camposExtraidos.map(c => (
                    <Badge key={c.campo} variant="outline" className="text-xs border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                      <Check className="h-2.5 w-2.5 mr-1" /> {c.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Campos editáveis */}
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                <Input value={form.nome} onChange={e => handleChange('nome', e.target.value)} className={form.nome ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CPF</Label>
                <Input value={form.cpf} onChange={e => handleChange('cpf', e.target.value)} className={`font-mono ${form.cpf ? 'border-emerald-300 bg-emerald-50/30' : ''}`} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data de Nascimento</Label>
                <Input value={form.dataNascimento} onChange={e => handleChange('dataNascimento', e.target.value)} placeholder="DD/MM/AAAA" className={form.dataNascimento ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sexo</Label>
                <Input value={form.sexo} onChange={e => handleChange('sexo', e.target.value)} className={form.sexo ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Estado Civil</Label>
                <Input value={form.estadoCivil} onChange={e => handleChange('estadoCivil', e.target.value)} className={form.estadoCivil ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <Input value={form.telefone} onChange={e => handleChange('telefone', e.target.value)} className={form.telefone ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <Input value={form.email} onChange={e => handleChange('email', e.target.value)} className={form.email ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Endereço</Label>
                <Input value={form.endereco} onChange={e => handleChange('endereco', e.target.value)} className={form.endereco ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Bairro</Label>
                <Input value={form.bairro} onChange={e => handleChange('bairro', e.target.value)} className={form.bairro ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CEP</Label>
                <Input value={form.cep} onChange={e => handleChange('cep', e.target.value)} className={form.cep ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cidade</Label>
                <Input value={form.cidade} onChange={e => handleChange('cidade', e.target.value)} className={form.cidade ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Input value={form.estado} onChange={e => handleChange('estado', e.target.value)} className={form.estado ? 'border-emerald-300 bg-emerald-50/30' : ''} />
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 3 — Plano + vendedor + confirmação */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecionar Plano *</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {planos.map(p => (
                  <button
                    key={p.codigo}
                    onClick={() => handleChange('plano', p.codigo)}
                    data-testid={`btn-plano-${p.codigo}`}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      form.plano === p.codigo ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <div className="font-mono font-bold text-sm">{p.codigo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{p.nome}</div>
                    <div className="text-xs font-semibold text-primary mt-1">
                      Tit: R$ {p.valorTitular.toFixed(2).replace('.', ',')}
                    </div>
                  </button>
                ))}
              </div>
              {form.plano && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Plano {form.plano} selecionado
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Forma de Pagamento</Label>
                <Select value={form.formaPagamento} onValueChange={v => handleChange('formaPagamento', v)}>
                  <SelectTrigger data-testid="select-forma-pagamento"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dia de Vencimento</Label>
                <Select value={form.vencimento} onValueChange={v => handleChange('vencimento', v)}>
                  <SelectTrigger data-testid="select-vencimento"><SelectValue placeholder="Dia..." /></SelectTrigger>
                  <SelectContent>
                    {diasVencimento.map(d => <SelectItem key={d} value={d}>Dia {d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Representante (Vendedor)</Label>
                <Select value={form.representante} onValueChange={v => handleChange('representante', v)}>
                  <SelectTrigger data-testid="select-representante"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {vendedores.map(v => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => handleChange('tipo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TITULAR">Titular</SelectItem>
                    <SelectItem value="DEPENDENTE">Dependente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Observações adicionais</Label>
                <Textarea
                  placeholder="Ex: Obstetrícia: sim, nome da mãe, etc."
                  value={form.observacao}
                  onChange={e => handleChange('observacao', e.target.value)}
                  className="resize-none"
                  rows={2}
                  data-testid="textarea-observacao"
                />
              </div>
            </div>

            {salvo && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
                <Check className="h-5 w-5" />
                <span className="font-medium">Cliente cadastrado com sucesso!</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-between pt-2">
          <div className="flex gap-2">
            {step === 1 && jaAnalisou && (
              <Button variant="ghost" size="sm" onClick={handleLimpar} className="gap-1.5 text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}>
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleFechar}>Cancelar</Button>

            {step === 1 && modo === 'colar' && (
              <Button
                onClick={handleAnalisar}
                disabled={!textoColar.trim() || analisando}
                className="gap-2 bg-primary"
                data-testid="btn-analisar-texto"
              >
                {analisando ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Analisando...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Analisar e Preencher</>
                )}
              </Button>
            )}

            {step === 1 && modo === 'manual' && (
              <Button onClick={() => setStep(2)} data-testid="btn-proximo-cadastro">
                Próximo
              </Button>
            )}

            {step === 2 && (
              <Button onClick={() => setStep(3)} data-testid="btn-proximo-plano">
                Próximo: Plano
              </Button>
            )}

            {step === 3 && (
              <Button
                className="bg-primary"
                onClick={handleSalvar}
                disabled={salvo || !form.nome || !form.cpf}
                data-testid="btn-salvar-cliente"
              >
                {salvo ? 'Salvando...' : 'Cadastrar Cliente'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
