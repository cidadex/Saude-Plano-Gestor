import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserMinus,
  ClipboardList,
  FileText,
  Briefcase,
  LogOut,
  BellRing,
  ChevronRight,
  Home,
  HeartPulse,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const rotulos: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/clientes': 'Clientes',
  '/admin/cancelados': 'Cancelados',
  '/admin/planos': 'Planos',
  '/admin/vendedores': 'Vendedores',
  '/admin/propostas': 'Propostas',
  '/admin/cobranca': 'Cobrança',
};

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

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/cancelados", label: "Cancelados", icon: UserMinus },
  { href: "/admin/planos", label: "Planos", icon: ClipboardList },
  { href: "/admin/vendedores", label: "Vendedores", icon: Briefcase },
  { href: "/admin/propostas", label: "Propostas", icon: FileText },
  { href: "/admin/cobranca", label: "Cobrança", icon: BellRing },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40 shrink-0">
            <HeartPulse className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none tracking-tight">Hapvida</p>
            <p className="text-blue-300/70 text-[11px] mt-0.5 font-medium uppercase tracking-widest">Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Menu</p>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/10 text-white border border-blue-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-400" />
              )}
              <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <Link
          href="/"
          data-testid="nav-sair"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent"
        >
          <LogOut className="h-4 w-4 text-slate-500" />
          Sair
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-60 flex-col bg-[#0d1526] border-r border-white/[0.06] fixed top-0 bottom-0 left-0">
        {sidebarContent}
      </aside>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 bottom-0 w-64 bg-[#0d1526] border-r border-white/10 z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col md:ml-60">

        {/* Topbar mobile */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0d1526] border-b border-white/[0.06]">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-blue-400" />
            <span className="font-bold text-white text-sm">Hapvida Admin</span>
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
