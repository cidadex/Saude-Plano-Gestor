import { Link } from "wouter";
import { Shield, User, HeartPulse, ArrowRight, TrendingUp, Users, FileCheck } from "lucide-react";
import { vendedorAtual } from "@/data/vendedores";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1120] flex items-center justify-center p-4">

      {/* Orbs decorativos de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/3 w-[600px] h-[600px] rounded-full bg-blue-700/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-700/15 blur-[100px]" />
        <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full bg-cyan-700/10 blur-[80px]" />
      </div>

      {/* Grade sutil de fundo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full max-w-4xl space-y-12">

        {/* Header — Logo + título */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl">
                <HeartPulse className="w-8 h-8 text-white" strokeWidth={1.8} />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white">
              Sistema de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Gestão
              </span>
            </h1>
            <p className="mt-3 text-lg text-slate-400 font-light">
              Gestão de Vendas de Planos de Saúde
            </p>
          </div>

          {/* Pills de stats */}
          <div className="flex items-center justify-center gap-6 pt-2">
            {[
              { icon: Users, label: "Carteira Ativa" },
              { icon: TrendingUp, label: "Vendas & Metas" },
              { icon: FileCheck, label: "Propostas" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-slate-500 text-sm">
                <Icon className="h-3.5 w-3.5 text-blue-500" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Cards de acesso */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Admin */}
          <Link href="/admin">
            <div
              className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-900/30 hover:-translate-y-1"
              data-testid="card-admin-login"
            >
              {/* Glow top-left */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative">
                {/* Ícone */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center mb-6 group-hover:from-blue-500/30 group-hover:to-indigo-600/30 transition-all duration-300">
                  <Shield className="w-7 h-7 text-blue-400" strokeWidth={1.8} />
                </div>

                {/* Texto */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Administrador</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Acesso completo à carteira, comissionamento, relatórios gerais e gestão de vendedores.
                  </p>
                </div>

                {/* Botão */}
                <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold group-hover:text-blue-300 transition-colors">
                  Acessar Painel Admin
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
                </div>
              </div>

              {/* Divider colorido no topo */}
              <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </Link>

          {/* Vendedor */}
          <Link href="/vendedor">
            <div
              className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-900/30 hover:-translate-y-1"
              data-testid="card-vendedor-login"
            >
              {/* Glow top-left */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative">
                {/* Ícone */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center mb-6 group-hover:from-emerald-500/30 group-hover:to-teal-600/30 transition-all duration-300">
                  <User className="w-7 h-7 text-emerald-400" strokeWidth={1.8} />
                </div>

                {/* Texto */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Vendedor</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Painel pessoal de{" "}
                    <span className="text-emerald-400 font-medium">{vendedorAtual.nome}</span>.
                    Propostas, boletos, comissões e sua carteira de clientes.
                  </p>
                </div>

                {/* Botão */}
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold group-hover:text-emerald-300 transition-colors">
                  Acessar Painel Vendedor
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
                </div>
              </div>

              {/* Divider colorido no topo */}
              <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </Link>
        </div>

        {/* Rodapé */}
        <p className="text-center text-slate-600 text-xs">
          © 2026 Sistema de Gestão de Planos de Saúde
        </p>
      </div>
    </div>
  );
}
