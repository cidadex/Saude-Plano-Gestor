import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, FileText, LogOut, ChevronRight,
  Home, HeartPulse, Menu, BarChart3, Banknote, BellRing,
  Briefcase, Sun, Moon, ShieldAlert, Receipt,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";

const rotulos: Record<string, string> = {
  '/gerente': 'Dashboard',
  '/gerente/equipe': 'Equipe de Vendas',
  '/gerente/clientes': 'Clientes',
  '/gerente/financeiro': 'Financeiro',
  '/gerente/comissoes': 'Comissões',
  '/gerente/relatorios': 'Relatórios',
  '/gerente/propostas': 'Propostas',
  '/gerente/cobranca': 'Cobrança',
};

type NavDef = { href: string; label: string; icon: React.ElementType; permissao: string | null };

const NAV_DEFS: NavDef[] = [
  { href: "/gerente",            label: "Dashboard",       icon: LayoutDashboard, permissao: "ver_dashboard" },
  { href: "/gerente/equipe",     label: "Equipe",          icon: Briefcase,       permissao: "ver_equipe" },
  { href: "/gerente/clientes",   label: "Clientes",        icon: Users,           permissao: "ver_clientes" },
  { href: "/gerente/propostas",  label: "Propostas",       icon: FileText,        permissao: "ver_propostas" },
  { href: "/gerente/financeiro", label: "Financeiro",      icon: Banknote,        permissao: "ver_financeiro" },
  { href: "/gerente/comissoes",  label: "Comissões",       icon: BellRing,        permissao: "ver_comissoes" },
  { href: "/gerente/cobranca",   label: "Cobrança",        icon: Receipt,         permissao: "ver_cobranca" },
  { href: "/gerente/relatorios", label: "Relatórios",      icon: BarChart3,       permissao: "ver_relatorios" },
];

function Breadcrumb({ location }: { location: string }) {
  if (location === '/gerente') return null;
  const label = rotulos[location];
  if (!label) return null;
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 pb-4 border-b border-border/50">
      <Home className="h-3.5 w-3.5" />
      <Link href="/gerente" className="hover:text-foreground transition-colors">Início</Link>
      <ChevronRight className="h-3.5 w-3.5 opacity-50" />
      <span className="text-foreground font-semibold">{label}</span>
    </nav>
  );
}

export function GerenteLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { logout, user } = useAuth();

  const permissoes = user?.permissoes ?? [];
  const visibleNav = NAV_DEFS.filter(n => n.permissao === null || permissoes.includes(n.permissao));

  const nomeGerente = user?.nome ?? "Gerente";
  const initials = nomeGerente.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/40 shrink-0">
            <HeartPulse className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none tracking-tight">Gestão</p>
            <p className="text-amber-300/70 text-[10px] mt-0.5 font-semibold uppercase tracking-widest">Painel Gerente</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{nomeGerente}</p>
            <p className="text-amber-400/60 text-[11px]">Gerente Comercial</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Menu</p>
        {visibleNav.map((item) => {
          const active = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                active
                  ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/10 text-white border border-amber-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-400" />}
              <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-0.5">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent transition-all"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-400" />}
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </button>
        <button
          onClick={() => void logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent transition-all"
        >
          <LogOut className="h-4 w-4 text-slate-500" />
          Sair ({nomeGerente})
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 flex-col bg-[#0d1526] border-r border-white/[0.06] fixed top-0 bottom-0 left-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 bottom-0 w-64 bg-[#0d1526] border-r border-white/10 z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col md:ml-60">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0d1526] border-b border-white/[0.06]">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-amber-400" />
            <span className="font-bold text-white text-sm">Gestão Gerente</span>
          </div>
        </div>
        <main className="flex-1 overflow-auto">
          <div className="p-5 md:p-8 max-w-7xl mx-auto">
            <Breadcrumb location={location} />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function GerenteGuard({ permissao, children }: { permissao: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const permissoes = user?.permissoes ?? [];
  if (!permissoes.includes(permissao)) {
    return <Redirect to="/gerente/sem-permissao" />;
  }
  return <>{children}</>;
}
