import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, UserMinus, ClipboardList, FileText,
  Briefcase, LogOut, BellRing, ChevronRight, Home, HeartPulse,
  Menu, BarChart3, Banknote, ChevronDown, Sun, Moon,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

const rotulos: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/clientes': 'Clientes Ativos',
  '/admin/cancelados': 'Cancelados',
  '/admin/planos': 'Planos',
  '/admin/vendedores': 'Equipe de Vendas',
  '/admin/gerentes': 'Gerentes',
  '/admin/propostas': 'Propostas',
  '/admin/cobranca': 'Cobrança',
  '/admin/relatorios': 'Relatórios',
  '/admin/financeiro': 'Financeiro',
  '/admin/comissoes': 'Comissões',
};

type NavItem = { href: string; label: string; icon: React.ElementType; sub?: { href: string; label: string }[] };

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/admin/clientes", label: "Carteira", icon: Users,
    sub: [
      { href: "/admin/clientes", label: "Clientes Ativos" },
      { href: "/admin/cancelados", label: "Cancelados" },
    ],
  },
  { href: "/admin/financeiro", label: "Financeiro", icon: Banknote },
  { href: "/admin/comissoes", label: "Comissões", icon: BellRing },
  { href: "/admin/propostas", label: "Propostas", icon: FileText },
  { href: "/admin/planos", label: "Planos", icon: ClipboardList },
  {
    href: "/admin/vendedores", label: "Equipe", icon: Briefcase,
    sub: [
      { href: "/admin/vendedores", label: "Vendedores" },
      { href: "/admin/gerentes", label: "Gerentes" },
    ],
  },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

function Breadcrumb({ location }: { location: string }) {
  if (location === '/admin') return null;
  const label = rotulos[location];
  if (!label) return null;
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 pb-4 border-b border-border/50">
      <Home className="h-3.5 w-3.5" />
      <Link href="/admin" className="hover:text-foreground transition-colors">Início</Link>
      <ChevronRight className="h-3.5 w-3.5 opacity-50" />
      <span className="text-foreground font-semibold">{label}</span>
    </nav>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>('/admin/clientes');
  const { theme, toggle } = useTheme();
  const { logout, user } = useAuth();

  const isGroupActive = (item: NavItem) =>
    item.sub ? item.sub.some(s => s.href === location) : location === item.href;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40 shrink-0">
            <HeartPulse className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none tracking-tight">Gestão</p>
            <p className="text-blue-300/70 text-[10px] mt-0.5 font-semibold uppercase tracking-widest">Painel Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Menu</p>
        {navItems.map((item) => {
          const active = isGroupActive(item);
          const isExpanded = expandedGroup === item.href;

          if (item.sub) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : item.href)}
                  className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                    active
                      ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/10 text-white border border-blue-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-400" />}
                  <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                    {item.sub.map(sub => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                          location === sub.href
                            ? 'text-blue-300 bg-blue-500/10'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                active
                  ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/10 text-white border border-blue-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-400" />}
              <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
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
          Sair ({user?.nome ?? ""})
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
            <HeartPulse className="h-4 w-4 text-blue-400" />
            <span className="font-bold text-white text-sm">Gestão Admin</span>
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
