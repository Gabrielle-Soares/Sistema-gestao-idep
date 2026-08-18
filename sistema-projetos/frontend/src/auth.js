const TOKEN_KEY = "sistema_projetos_token";
const USUARIO_KEY = "sistema_projetos_usuario";

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
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, senha }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.erro || "Falha no login");
  }
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(data.usuario));
  return data.usuario;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}
