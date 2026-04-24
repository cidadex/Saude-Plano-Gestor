import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, FileText, DollarSign, Receipt, LogOut,
  BellRing, ChevronRight, Home, Shield, HeartPulse, Menu,
  Users, Sun, Moon, History,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

const rotulos: Record<string, string> = {
  '/vendedor': 'Dashboard',
  '/vendedor/carteira': 'Minha Carteira',
  '/vendedor/propostas': 'Propostas',
  '/vendedor/comissoes': 'Comissões',
  '/vendedor/boletos': 'Boletos',
  '/vendedor/cobranca': 'Cobrança',
  '/vendedor/planos': 'Tabela de Planos',
  '/vendedor/historico': 'Histórico de Comunicações',
};

const navItems = [
  { href: "/vendedor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendedor/carteira", label: "Minha Carteira", icon: Users },
  { href: "/vendedor/propostas", label: "Propostas", icon: FileText },
  { href: "/vendedor/planos", label: "Planos", icon: Shield },
  { href: "/vendedor/boletos", label: "Boletos", icon: Receipt },
  { href: "/vendedor/comissoes", label: "Comissões", icon: DollarSign },
  { href: "/vendedor/cobranca", label: "Cobrança", icon: BellRing },
  { href: "/vendedor/historico", label: "Histórico WhatsApp", icon: History },
];

function Breadcrumb({ location }: { location: string }) {
  if (location === '/vendedor') return null;
  const label = rotulos[location];
  if (!label) return null;
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 pb-4 border-b border-border/50">
      <Home className="h-3.5 w-3.5" />
      <Link href="/vendedor" className="hover:text-foreground transition-colors">Início</Link>
      <ChevronRight className="h-3.5 w-3.5 opacity-50" />
      <span className="text-foreground font-semibold">{label}</span>
    </nav>
  );
}

export function VendedorLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { logout, user } = useAuth();

  const nomeVendedor = user?.nome ?? "Vendedor";
  const initials = nomeVendedor.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + avatar */}
      <div className="px-5 py-5 border-b border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/40 shrink-0">
            <HeartPulse className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none tracking-tight">Hapvida</p>
            <p className="text-emerald-300/70 text-[10px] mt-0.5 font-semibold uppercase tracking-widest">Vendedor</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{nomeVendedor}</p>
            <p className="text-emerald-400/60 text-[11px]">Consultor de Vendas</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Meu Painel</p>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium group ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/10 text-white border border-emerald-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`}
            >
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-400" />}
              <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
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
          data-testid="nav-sair"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent transition-all"
        >
          <LogOut className="h-4 w-4 text-slate-500" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 flex-col bg-[#0d1a13] border-r border-white/[0.06] fixed top-0 bottom-0 left-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 bottom-0 w-64 bg-[#0d1a13] border-r border-white/10 z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col md:ml-60">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0d1a13] border-b border-white/[0.06]">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-white text-sm">{nomeVendedor}</span>
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
