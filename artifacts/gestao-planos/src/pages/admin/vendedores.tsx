import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { Plus, Pencil, KeyRound, Power, PowerOff, Users, Loader2, Search } from "lucide-react";

interface Vendedor {
  id: string;
  userId: string;
  nome: string;
  email: string;
  telefone?: string | null;
  comissionado: boolean;
  tipoComissao?: "VENDA" | "SERVICO" | "AMBOS" | null;
  active: boolean;
  totalClientes: number;
  createdAt: string;
}

const EMPTY: Omit<Vendedor, "id" | "userId" | "active" | "totalClientes" | "createdAt"> & { senha: string } = {
  nome: "",
  email: "",
  telefone: "",
  comissionado: false,
  tipoComissao: "VENDA",
  senha: "",
};

function VendedorModal({
  open,
  onClose,
  vendedor,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  vendedor?: Vendedor;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!vendedor;
  const [form, setForm] = useState({
    nome: vendedor?.nome ?? "",
    email: vendedor?.email ?? "",
    telefone: vendedor?.telefone ?? "",
    comissionado: vendedor?.comissionado ?? false,
    tipoComissao: vendedor?.tipoComissao ?? "VENDA",
    senha: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (): Promise<void> => {
    if (!form.nome || !form.email) { toast({ variant: "destructive", title: "Nome e e-mail são obrigatórios" }); return; }
    if (!isEdit && !form.senha) { toast({ variant: "destructive", title: "Informe a senha inicial" }); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await apiFetch(`/admin/vendedores/${vendedor.id}`, { method: "PUT", body: JSON.stringify(form) });
        toast({ title: "Vendedor atualizado com sucesso" });
      } else {
        await apiFetch("/admin/vendedores", { method: "POST", body: JSON.stringify(form) });
        toast({ title: "Vendedor cadastrado com sucesso" });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Nome do vendedor" />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail *</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@empresa.com.br" />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone / WhatsApp</Label>
            <Input value={form.telefone ?? ""} onChange={e => set("telefone", e.target.value)} placeholder="(85) 99999-0000" />
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Senha inicial *</Label>
              <Input type="password" value={form.senha} onChange={e => set("senha", e.target.value)} placeholder="Mín. 6 caracteres" />
            </div>
          )}
          <div className="flex items-center gap-3 pt-1">
            <Switch checked={form.comissionado} onCheckedChange={v => set("comissionado", v)} id="comissionado" />
            <Label htmlFor="comissionado" className="cursor-pointer">Vendedor comissionado</Label>
          </div>
          {form.comissionado && (
            <div className="space-y-1.5">
              <Label>Tipo de comissão</Label>
              <Select value={form.tipoComissao ?? "VENDA"} onValueChange={v => set("tipoComissao", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENDA">Venda</SelectItem>
                  <SelectItem value="SERVICO">Serviço</SelectItem>
                  <SelectItem value="AMBOS">Ambos (Venda + Serviço)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordModal({ open, onClose, userId, nome }: { open: boolean; onClose: () => void; userId: string; nome: string }) {
  const { toast } = useToast();
  const [nova, setNova] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (): Promise<void> => {
    if (nova.length < 6) { toast({ variant: "destructive", title: "A senha deve ter no mínimo 6 caracteres" }); return; }
    setSaving(true);
    try {
      await apiFetch(`/admin/users/${userId}/reset-password`, { method: "PATCH", body: JSON.stringify({ novaSenha: nova }) });
      toast({ title: `Senha de ${nome} redefinida com sucesso` });
      setNova("");
      onClose();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Redefinir Senha — {nome}</DialogTitle></DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>Nova senha</Label>
          <Input type="password" value={nova} onChange={e => setNova(e.target.value)} placeholder="Mín. 6 caracteres" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Redefinir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminVendedores() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendedor | undefined>();
  const [resetTarget, setResetTarget] = useState<{ userId: string; nome: string } | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Vendedor | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vendedores"],
    queryFn: () => apiFetch("/admin/vendedores") as Promise<{ vendedores: Vendedor[] }>,
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      apiFetch(`/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["admin-vendedores"] });
      toast({ title: v.active ? "Conta ativada" : "Conta suspensa" });
      setSuspendTarget(null);
    },
    onError: (err) => toast({ variant: "destructive", title: String(err) }),
  });

  const vendedores = (data?.vendedores ?? []).filter(v =>
    v.nome.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase())
  );

  const ativos = data?.vendedores.filter(v => v.active).length ?? 0;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Equipe de Vendas</h2>
          <p className="text-muted-foreground mt-1">Cadastro, comissão e gestão de contas dos vendedores.</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Vendedor
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total de Vendedores</p>
            <p className="text-2xl font-bold">{data?.vendedores.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Contas Ativas</p>
            <p className="text-2xl font-bold">{ativos}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Suspensas</p>
            <p className="text-2xl font-bold">{(data?.vendedores.length ?? 0) - ativos}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou e-mail..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-sm text-muted-foreground">{vendedores.length} vendedor(es)</span>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Vendedor</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead className="text-center">Clientes</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendedores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhum vendedor encontrado.
                </TableCell>
              </TableRow>
            ) : vendedores.map(v => (
              <TableRow key={v.id} className={!v.active ? "opacity-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${v.active ? "bg-emerald-600" : "bg-slate-400"}`}>
                      {v.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{v.nome}</p>
                      <p className="text-xs text-muted-foreground">{v.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.telefone ?? "—"}</TableCell>
                <TableCell>
                  {v.comissionado ? (
                    <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">
                      {v.tipoComissao}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Não comissionado</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {v.totalClientes}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {v.active
                    ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">Ativo</Badge>
                    : <Badge variant="secondary" className="text-xs">Suspenso</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                      onClick={() => { setEditing(v); setModalOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Redefinir senha"
                      onClick={() => setResetTarget({ userId: v.userId, nome: v.nome })}>
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className={`h-8 w-8 ${v.active ? "text-red-500 hover:text-red-600" : "text-emerald-600 hover:text-emerald-700"}`}
                      title={v.active ? "Suspender conta" : "Ativar conta"}
                      onClick={() => setSuspendTarget(v)}>
                      {v.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <VendedorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        vendedor={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-vendedores"] })}
      />

      {resetTarget && (
        <ResetPasswordModal
          open={!!resetTarget}
          onClose={() => setResetTarget(null)}
          userId={resetTarget.userId}
          nome={resetTarget.nome}
        />
      )}

      {suspendTarget && (
        <AlertDialog open={!!suspendTarget} onOpenChange={() => setSuspendTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {suspendTarget.active ? "Suspender conta" : "Ativar conta"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {suspendTarget.active
                  ? `Isso impedirá que ${suspendTarget.nome} faça login no sistema. Você pode reativar a qualquer momento.`
                  : `${suspendTarget.nome} poderá fazer login no sistema novamente.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className={suspendTarget.active ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => statusMutation.mutate({ userId: suspendTarget.userId, active: !suspendTarget.active })}
              >
                {suspendTarget.active ? "Suspender" : "Ativar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
