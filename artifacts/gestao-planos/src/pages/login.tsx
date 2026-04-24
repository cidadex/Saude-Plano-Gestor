import { useState, FormEvent } from "react";
import { useLocation, Link } from "wouter";
import { HeartPulse, Eye, EyeOff, Loader2, Users, Building2, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { login, clienteLogin, user } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"staff" | "cliente">("cliente");

  // Staff login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Client login
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    if (user.role === "admin") navigate("/admin");
    else if (user.role === "vendedor") navigate("/vendedor");
    else if (user.role === "gerente") navigate("/gerente");
    else if (user.role === "cliente") navigate("/cliente");
  }

  const handleStaffSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleClienteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await clienteLogin(cpf, dataNascimento);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1120] flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/3 w-[600px] h-[600px] rounded-full bg-blue-700/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-rose-700/15 blur-[100px]" />
        <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full bg-cyan-700/10 blur-[80px]" />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl">
                <HeartPulse className="w-8 h-8 text-white" strokeWidth={1.8} />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Sistema de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Gestão
              </span>
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">Gestão de Planos de Saúde</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => { setTab("cliente"); setError(""); }}
            data-testid="tab-cliente"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === "cliente" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Users className="h-4 w-4" /> Sou Beneficiário
          </button>
          <button
            onClick={() => { setTab("staff"); setError(""); }}
            data-testid="tab-staff"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === "staff" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Building2 className="h-4 w-4" /> Equipe
          </button>
        </div>

        {/* FORM — Beneficiário (cliente) */}
        {tab === "cliente" && (
          <form onSubmit={handleClienteSubmit} className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-4">
              <p className="text-slate-400 text-xs text-center">Acesse seu portal com CPF e data de nascimento</p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CPF</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  required
                  autoFocus
                  placeholder="000.000.000-00"
                  data-testid="input-cliente-cpf"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data de Nascimento</label>
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={e => setDataNascimento(e.target.value)}
                  required
                  data-testid="input-cliente-nascimento"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="btn-cliente-entrar"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-all shadow-lg shadow-rose-900/40"
              >
                {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Entrando...</>) : "Acessar meu plano"}
              </button>
            </div>
          </form>
        )}

        {/* FORM — Equipe (staff) */}
        {tab === "staff" && (
          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="seu@email.com"
                  data-testid="input-staff-email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Senha</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••"
                    data-testid="input-staff-password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="btn-staff-entrar"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-all shadow-lg shadow-blue-900/40"
              >
                {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Entrando...</>) : "Entrar"}
              </button>
            </div>
          </form>
        )}

        <Link href="/acesso">
          <button className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors py-1">
            <KeyRound className="h-3 w-3" />
            Ver credenciais de acesso / Executar seed
          </button>
        </Link>
        <p className="text-center text-slate-600 text-xs">© 2026 Gestão de Planos de Saúde</p>
      </div>
    </div>
  );
}
