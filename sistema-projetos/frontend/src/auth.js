const TOKEN_KEY = "sistema_projetos_token";
const USUARIO_KEY = "sistema_projetos_usuario";
import { API_URL } from "./config";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsuario() {
  const raw = localStorage.getItem(USUARIO_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!getToken();
}

export async function login(usuario, senha) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, senha }),
  });

  const contentType = res.headers.get("content-type") || "";
  const body = await res.text();
  let data = null;
  if (contentType.includes("application/json") && body) {
    try {
      data = JSON.parse(body);
    } catch {
      // A resposta será tratada abaixo como inválida, sem expor erro de parse.
    }
  }

  if (!res.ok) {
    throw new Error(
      (data && data.erro) ||
        `Falha no login (HTTP ${res.status}). Verifique a URL configurada para a API.`
    );
  }

  if (!data || !data.token || !data.usuario) {
    throw new Error("A API retornou uma resposta inválida ao fazer login.");
  }

  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(data.usuario));
  return data.usuario;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}
