import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, UserPlus } from "lucide-react";
import { vendedores } from "@/data/vendedores";
import { planos } from "@/data/planos";

interface CadastroClienteProps {
  open: boolean;
  onClose: () => void;
}

const formasPagamento = ['BOLETO', 'CORA', 'C6', 'BTG', 'PIX', 'DÉBITO EM FOLHA'];
const diasVencimento = ['1', '5', '10', '15', '20', '25', '30'];

export default function CadastroCliente({ open, onClose }: CadastroClienteProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [salvo, setSalvo] = useState(false);

  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    telefone: '',
    email: '',
    cidade: '',
    estado: 'CE',
    bairro: '',
    tipo: 'TITULAR',
    responsavel: '',
    representante: '',
    plano: '',
    formaPagamento: '',
    vencimento: '',
    observacao: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSalvar = () => {
    setSalvo(true);
    setTimeout(() => {
      setSalvo(false);
      setStep(1);
      setForm({
        nome: '', cpf: '', dataNascimento: '', telefone: '', email: '',
        cidade: '', estado: 'CE', bairro: '', tipo: 'TITULAR',
        responsavel: '', representante: '', plano: '', formaPagamento: '',
        vencimento: '', observacao: '',
      });
      onClose();
    }, 1500);
  };

  const handleFechar = () => {
    setStep(1);
    setSalvo(false);
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
            Preencha os dados para cadastrar um novo beneficiário.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                step >= s ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'
              }`}>
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              <span className={`text-xs font-medium ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s === 1 ? 'Dados Pessoais' : s === 2 ? 'Plano' : 'Revisão'}
              </span>
              {s < 3 && <div className="h-px w-8 bg-muted-foreground/30" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  placeholder="Nome do beneficiário"
                  value={form.nome}
                  onChange={e => handleChange('nome', e.target.value)}
                  data-testid="input-nome-cliente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={e => handleChange('cpf', e.target.value)}
                  data-testid="input-cpf-cliente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dataNasc">Data de Nascimento *</Label>
                <Input
                  id="dataNasc"
                  type="date"
                  value={form.dataNascimento}
                  onChange={e => handleChange('dataNascimento', e.target.value)}
                  data-testid="input-data-nasc"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => handleChange('tipo', v)}>
                  <SelectTrigger id="tipo" data-testid="select-tipo-cliente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TITULAR">Titular</SelectItem>
                    <SelectItem value="DEPENDENTE">Dependente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                <Input
                  id="telefone"
                  placeholder="(85) 99999-9999"
                  value={form.telefone}
                  onChange={e => handleChange('telefone', e.target.value)}
                  data-testid="input-telefone-cliente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  data-testid="input-email-cliente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  placeholder="Fortaleza"
                  value={form.cidade}
                  onChange={e => handleChange('cidade', e.target.value)}
                  data-testid="input-cidade-cliente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  placeholder="Bairro"
                  value={form.bairro}
                  onChange={e => handleChange('bairro', e.target.value)}
                  data-testid="input-bairro-cliente"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Plano de Saúde *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {planos.map(p => (
                    <button
                      key={p.codigo}
                      onClick={() => handleChange('plano', p.codigo)}
                      data-testid={`btn-plano-${p.codigo}`}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        form.plano === p.codigo
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/40'
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
              </div>
              <div className="space-y-1.5">
                <Label>Forma de Pagamento *</Label>
                <Select value={form.formaPagamento} onValueChange={v => handleChange('formaPagamento', v)}>
                  <SelectTrigger data-testid="select-forma-pagamento">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map(fp => (
                      <SelectItem key={fp} value={fp}>{fp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dia de Vencimento *</Label>
                <Select value={form.vencimento} onValueChange={v => handleChange('vencimento', v)}>
                  <SelectTrigger data-testid="select-vencimento">
                    <SelectValue placeholder="Dia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {diasVencimento.map(d => (
                      <SelectItem key={d} value={d}>Dia {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Responsável (Titular da conta)</Label>
                <Input
                  placeholder="Nome do responsável"
                  value={form.responsavel}
                  onChange={e => handleChange('responsavel', e.target.value)}
                  data-testid="input-responsavel"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Representante (Vendedor)</Label>
                <Select value={form.representante} onValueChange={v => handleChange('representante', v)}>
                  <SelectTrigger data-testid="select-representante">
                    <SelectValue placeholder="Selecione o vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map(v => (
                      <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Observação</Label>
                <Textarea
                  placeholder="Observações adicionais..."
                  value={form.observacao}
                  onChange={e => handleChange('observacao', e.target.value)}
                  className="resize-none"
                  rows={3}
                  data-testid="textarea-observacao"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
              <h3 className="font-semibold text-sm">Dados Pessoais</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{form.nome || '—'}</span></div>
                <div><span className="text-muted-foreground">CPF:</span> <span className="font-mono">{form.cpf || '—'}</span></div>
                <div><span className="text-muted-foreground">Nascimento:</span> <span>{form.dataNascimento || '—'}</span></div>
                <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="outline" className="text-xs">{form.tipo}</Badge></div>
                <div><span className="text-muted-foreground">Telefone:</span> <span>{form.telefone || '—'}</span></div>
                <div><span className="text-muted-foreground">Cidade:</span> <span>{form.cidade || '—'}</span></div>
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
              <h3 className="font-semibold text-sm">Plano Contratado</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Plano:</span> <span className="font-mono font-bold">{form.plano || '—'}</span></div>
                <div><span className="text-muted-foreground">Pagamento:</span> <span>{form.formaPagamento || '—'}</span></div>
                <div><span className="text-muted-foreground">Vencimento:</span> <span>Dia {form.vencimento || '—'}</span></div>
                <div><span className="text-muted-foreground">Vendedor:</span> <span>{form.representante || '—'}</span></div>
                {form.observacao && (
                  <div className="col-span-2"><span className="text-muted-foreground">Obs:</span> <span>{form.observacao}</span></div>
                )}
              </div>
            </div>
            {salvo && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="font-medium">Cliente cadastrado com sucesso!</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}>
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleFechar}>Cancelar</Button>
            {step < 3 ? (
              <Button onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)} data-testid="btn-proximo-cadastro">
                Próximo
              </Button>
            ) : (
              <Button
                className="bg-primary"
                onClick={handleSalvar}
                disabled={salvo}
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
