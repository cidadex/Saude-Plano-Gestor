import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { Users2, Plus, Pencil, Trash2, KeyRound, Search, Building2, User as UserIcon, Mail } from "lucide-react";

type Responsavel = {
  id: string;
  userId: string | null;
  tipo: "PF" | "PJ";
  nome: string;
  cpfCnpj: string;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacao: string | null;
  totalBeneficiarios: number;
};

type FormState = {
  tipo: "PF" | "PJ";
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  observacao: string;
  criarLogin: boolean;
  senha: string;
};

const emptyForm: FormState = {
  tipo: "PF", nome: "", cpfCnpj: "", email: "", telefone: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "CE",
  observacao: "", criarLogin: false, senha: "",
};

function formatDoc(d: string): string {
  const digits = d.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
  if (digits.length === 14) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  return d;
}

export default function AdminResponsaveis() {
  const { toast } = useToast();
  const [items, setItems] = useState<Responsavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Responsavel | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState<Responsavel | null>(null);
  const [novaSenha, setNovaSenha] = useState("");

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ responsaveis: Responsavel[] }>("/admin/responsaveis");
      setItems(data.responsaveis);
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Falha", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { void carregar(); }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return items;
    return items.filter(r =>
      r.nome.toLowerCase().includes(q) ||
      r.cpfCnpj.includes(q.replace(/\D/g, "")) ||
      (r.email ?? "").toLowerCase().includes(q),
    );
  }, [items, busca]);

  const abrirNovo = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const abrirEdicao = (r: Responsavel) => {
    setEditing(r);
    setForm({
      tipo: r.tipo,
      nome: r.nome,
      cpfCnpj: formatDoc(r.cpfCnpj),
      email: r.email ?? "",
      telefone: r.telefone ?? "",
      cep: r.cep ?? "",
      logradouro: r.logradouro ?? "",
      numero: r.numero ?? "",
      complemento: r.complemento ?? "",
      bairro: r.bairro ?? "",
      cidade: r.cidade ?? "",
      estado: r.estado ?? "CE",
      observacao: r.observacao ?? "",
      criarLogin: false,
      senha: "",
    });
    setOpen(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    if (!form.cpfCnpj.replace(/\D/g, "")) { toast({ title: "CPF/CNPJ obrigatório", variant: "destructive" }); return; }
    if (!editing && form.criarLogin && (!form.email || !form.senha)) {
      toast({ title: "E-mail e senha obrigatórios para criar login", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        cpfCnpj: form.cpfCnpj.replace(/\D/g, ""),
      };
      if (editing) {
        await apiFetch(`/admin/responsaveis/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast({ title: "Responsável atualizado" });
      } else {
        await apiFetch(`/admin/responsaveis`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Responsável cadastrado" });
      }
      setOpen(false);
      await carregar();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const remover = async (r: Responsavel) => {
    if (r.totalBeneficiarios > 0) {
      toast({ title: "Não permitido", description: "Existem beneficiários vinculados a este responsável.", variant: "destructive" });
      return;
    }
    if (!confirm(`Excluir responsável "${r.nome}"?`)) return;
    try {
      await apiFetch(`/admin/responsaveis/${r.id}`, { method: "DELETE" });
      toast({ title: "Responsável excluído" });
      await carregar();
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Falha", variant: "destructive" });
    }
  };

  const resetarSenha = async () => {
    if (!resetOpen) return;
    if (novaSenha.length < 6) { toast({ title: "Senha mínima de 6 caracteres", variant: "destructive" }); return; }
    try {
      await apiFetch(`/admin/responsaveis/${resetOpen.id}/reset-password`, {
        method: "POST", body: JSON.stringify({ novaSenha }),
      });
      toast({ title: "Senha redefinida" });
      setResetOpen(null);
      setNovaSenha("");
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Falha", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users2 className="h-6 w-6 text-primary" /> Responsáveis Financeiros
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pré-cadastre quem paga pelos planos. Pode ser PF (próprio beneficiário) ou PJ (empresa que paga por funcionários).
          </p>
        </div>
        <Button onClick={abrirNovo} className="gap-2" data-testid="btn-novo-responsavel">
          <Plus className="h-4 w-4" /> Novo Responsável
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 flex-wrap pb-3">
          <CardTitle className="text-base">Cadastrados</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, CPF/CNPJ ou e-mail" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum responsável encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Tipo</th>
                    <th className="py-2 pr-4 font-semibold">Nome</th>
                    <th className="py-2 pr-4 font-semibold">CPF/CNPJ</th>
                    <th className="py-2 pr-4 font-semibold">E-mail</th>
                    <th className="py-2 pr-4 font-semibold">Login</th>
                    <th className="py-2 pr-4 font-semibold">Beneficiários</th>
                    <th className="py-2 pr-2 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 pr-4 align-top">
                        {r.tipo === "PJ" ? (
                          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100"><Building2 className="h-3 w-3 mr-1" />PJ</Badge>
                        ) : (
                          <Badge variant="outline"><UserIcon className="h-3 w-3 mr-1" />PF</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4 align-top font-medium">{r.nome}</td>
                      <td className="py-3 pr-4 align-top font-mono text-xs">{formatDoc(r.cpfCnpj)}</td>
                      <td className="py-3 pr-4 align-top text-xs">{r.email ?? "—"}</td>
                      <td className="py-3 pr-4 align-top">
                        {r.userId ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><Mail className="h-3 w-3 mr-1" />Tem login</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem login</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 align-top">{r.totalBeneficiarios}</td>
                      <td className="py-3 pr-2 text-right align-top whitespace-nowrap">
                        {r.userId && (
                          <Button size="sm" variant="ghost" onClick={() => { setResetOpen(r); setNovaSenha(""); }} title="Resetar senha">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => abrirEdicao(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void remover(r)} className="text-rose-600 hover:text-rose-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal cadastro/edição */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Responsável" : "Novo Responsável Financeiro"}</DialogTitle>
            <DialogDescription>
              Cadastre quem é o responsável pelo pagamento. Para PJ, vincule um e-mail e senha para acesso ao painel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v: "PF" | "PJ") => setForm({ ...form, tipo: v })}>
                  <SelectTrigger data-testid="select-tipo-responsavel"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PF">PF — Pessoa Física</SelectItem>
                    <SelectItem value="PJ">PJ — Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{form.tipo === "PJ" ? "CNPJ" : "CPF"} *</Label>
                <Input value={form.cpfCnpj} onChange={e => setForm({ ...form, cpfCnpj: e.target.value })} className="font-mono" placeholder={form.tipo === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{form.tipo === "PJ" ? "Razão Social" : "Nome Completo"} *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} data-testid="input-nome-responsavel" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Logradouro</Label>
                <Input value={form.logradouro} onChange={e => setForm({ ...form, logradouro: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Complemento</Label>
                <Input value={form.complemento} onChange={e => setForm({ ...form, complemento: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Input value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} className="resize-none" />
            </div>

            {!editing && (
              <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.criarLogin} onChange={e => setForm({ ...form, criarLogin: e.target.checked })} />
                  Criar login para acesso ao painel
                </label>
                {form.criarLogin && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">E-mail de acesso *</Label>
                      <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="financeiro@empresa.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Senha (mín. 6) *</Label>
                      <Input type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => void salvar()} disabled={saving} data-testid="btn-salvar-responsavel">
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal reset senha */}
      <Dialog open={!!resetOpen} onOpenChange={o => !o && setResetOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>Nova senha para {resetOpen?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nova senha (mín. 6)</Label>
            <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(null)}>Cancelar</Button>
            <Button onClick={() => void resetarSenha()}>Redefinir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
