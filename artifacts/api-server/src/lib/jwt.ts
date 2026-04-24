import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "hapvida-gestao-secret-2026";
const JWT_EXPIRES = "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  role: "admin" | "gerente" | "vendedor" | "cliente";
  nome: string;
  vendedorId?: string;
  gerenteId?: string;
  clienteId?: string;
  permissoes?: string[];
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
