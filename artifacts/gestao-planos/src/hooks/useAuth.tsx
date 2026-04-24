import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type UserRole = "admin" | "gerente" | "vendedor" | "cliente";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  nome: string;
  vendedorId?: string;
  gerenteId?: string;
  permissoes?: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  clienteLogin: (cpf: string, dataNascimento: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  clienteLogin: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { user: AuthUser };
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error ?? "Erro ao fazer login");
    }

    const data = await res.json() as { user: AuthUser };
    setUser(data.user);
  };

  const clienteLogin = async (cpf: string, dataNascimento: string) => {
    const res = await fetch("/api/auth/cliente/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ cpf, dataNascimento }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error ?? "Erro ao fazer login");
    }

    const data = await res.json() as { user: AuthUser };
    setUser(data.user);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, clienteLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
