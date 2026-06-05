import { apiUrl } from "@/lib/api/baseUrl";
import type { AuthUser } from "@/store/authStore";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user?: AuthUser;
}

export async function loginRequest(login: string, password: string): Promise<LoginResponse> {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Неверный логин или пароль");
  }
  return res.json() as Promise<LoginResponse>;
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Session expired");
  return res.json() as Promise<AuthUser>;
}
