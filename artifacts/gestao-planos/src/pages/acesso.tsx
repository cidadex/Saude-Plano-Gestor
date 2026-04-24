import { useState } from "react";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import {
  HeartPulse, Database, CheckCircle2, Loader2, Copy, Check,
  ShieldCheck, Users, UserCog, Building2, User,
} from "lucide-react";

type Credencial = {
  label: string;
  email?: string;
  cpf?: string;
  nascimento?: string;
  senha?: string;
  cor: string;
  icon: React.ElementType;
};

const credenciais: Credencial[] = [
  {
    label: "Administrador",
    email: "admin@teste.com",
    senha: "123456",
    cor: "from-blue-600/20 to-indigo-600/10 border-blue-500/30",
    icon: ShieldCheck,
  },
  {
    label: "Gerente",
    email: "marcos@teste.com",
    senha: "123456",
    cor: "from-amber-600/20 to-orange-600/10 border-amber-500/30",
    icon: Building2,
  },
  {
    label: "Vendedor",
    email: "wladson@teste.com",
    senha: "123456",
    cor: "from-emerald-600/20 to-teal-600/10 border-emerald-500/30",
    icon: UserCog,
  },
  {
    label: "Vendedor 2",
    email: "carol@teste.com",
    senha: "123456",
    cor: "from-emerald-600/20 to-teal-600/10 border-emerald-500/30",
    icon: Users,
  },
  {
    label: "Beneficiário (cliente)",
    cpf: "483.665.870-53",
    nascimento: "02/05/1967",
    cor: "from-rose-600/20 to-pink-600/10 border-rose-500/30",
    icon: User,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
      title="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function AcessoPage() {
  const [seedando, setSeedando] = useState(false);
  const [seedOk, setSeedOk] = useState(false);
  const [seedErro, setSeedErro] = useState("");

  const handleSeed = async () => {
    setSeedando(true);
    setSeedErro("");
    setSeedOk(false);
    try {
      await apiFetch("/seed", { method: "POST" });
      setSeedOk(true);
    } catch (err) {
      setSeedErro(err instanceof Error ? err.message : "Erro ao executar seed");
    } finally {
      setSeedando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/40 mx-auto">
            <HeartPulse className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Credenciais de Acesso</h1>
          <p className="text-slate-400 text-sm">Dados para login no sistema de gestão</p>
        </div>

        {/* Botão de Seed */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
          <p className="text-xs text-slate-400 mb-3 text-center">
            Primeiro acesso ou banco vazio? Execute o seed para criar os usuários de teste.
          </p>
          <button
            onClick={handleSeed}
            disabled={seedando || seedOk}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all
              bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500
              disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-lg shadow-blue-900/30"
          >
            {seedando ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Criando usuários...</>
            ) : seedOk ? (
              <><CheckCircle2 className="h-4 w-4 text-green-300" /> Seed executado com sucesso!</>
            ) : (
              <><Database className="h-4 w-4" /> Executar Seed (popular banco)</>
            )}
          </button>
          {seedErro && (
            <p className="mt-2 text-xs text-red-400 text-center">{seedErro}</p>
          )}
        </div>

        {/* Cards de credenciais */}
        <div className="space-y-3">
          {credenciais.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className={`rounded-xl border bg-gradient-to-r p-4 ${c.cor}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-slate-300" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{c.label}</span>
                </div>
                <div className="space-y-1.5">
                  {c.email && (
                    <div className="flex items-center">
                      <span className="text-[11px] text-slate-500 w-16 shrink-0">E-mail</span>
                      <code className="text-sm text-white font-mono">{c.email}</code>
                      <CopyButton text={c.email} />
                    </div>
                  )}
                  {c.cpf && (
                    <div className="flex items-center">
                      <span className="text-[11px] text-slate-500 w-16 shrink-0">CPF</span>
                      <code className="text-sm text-white font-mono">{c.cpf}</code>
                      <CopyButton text={c.cpf} />
                    </div>
                  )}
                  {c.nascimento && (
                    <div className="flex items-center">
                      <span className="text-[11px] text-slate-500 w-16 shrink-0">Nasc.</span>
                      <code className="text-sm text-white font-mono">{c.nascimento}</code>
                      <CopyButton text={c.nascimento} />
                    </div>
                  )}
                  {c.senha && (
                    <div className="flex items-center">
                      <span className="text-[11px] text-slate-500 w-16 shrink-0">Senha</span>
                      <code className="text-sm text-white font-mono">{c.senha}</code>
                      <CopyButton text={c.senha} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Voltar ao login */}
        <div className="text-center">
          <Link href="/login">
            <button className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-2">
              ← Ir para o login
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
