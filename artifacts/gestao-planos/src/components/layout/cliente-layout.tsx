import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, FileText, LogOut, HeartPulse, Menu, Sun, Moon,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/cliente", label: "Início", icon: LayoutDashboard },
  { href: "/cliente/faturas", label: "Minhas Faturas", icon: FileText },
];

export function ClienteLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { logout, user } = useAuth();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/40 shrink-0">
            <HeartPulse className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none tracking-tight">Gestão</p>
            <p className="text-rose-300/70 text-[10px] mt-0.5 font-semibold uppercase tracking-widest">Portal do Beneficiário</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Menu</p>
        {navItems.map((item) => {
          const active = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                active
                  ? "bg-gradient-to-r from-rose-600/30 to-rose-500/10 text-white border border-rose-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-rose-400" />
              )}
              <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-rose-400" : "text-slate-500"}`} />
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
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-400" />
          )}
          {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
        </button>
        <button
          onClick={() => void logout()}
          data-testid="btn-cliente-sair"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent transition-all"
        >
          <LogOut className="h-4 w-4 text-slate-500" />
          Sair ({user?.nome?.split(" ")[0] ?? ""})
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-60 flex-col bg-[#0d1526] border-r border-white/[0.06] fixed top-0 bottom-0 left-0">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute top-0 left-0 bottom-0 w-64 bg-[#0d1526] border-r border-white/10 z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col md:ml-60">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0d1526] border-b border-white/[0.06]">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-400 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-rose-400" />
            <span className="font-bold text-white text-sm">Gestão Saúde</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          <div className="p-5 md:p-8 max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
