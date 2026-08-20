import { getToken, logout } from "./auth";
import { API_URL } from "./config";

const BASE = API_URL;

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  if (res.status === 401) {
    // sessão expirada ou inválida - volta para a tela de login
    logout();
    window.location.reload();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  // Evita erro de parse quando proxy/deploy devolve HTML ou texto no lugar de JSON.
  const contentType = res.headers.get("content-type") || "";
  const body = await res.text();
  let data = null;
  if (contentType.includes("application/json") && body) {
    try {
      data = JSON.parse(body);
    } catch {
      // A resposta será tratada abaixo como inválida.
    }
  }

  if (!res.ok) {
    const msg =
      (data && data.erro) ||
      `Erro ${res.status}: Servidor indisponível ou rota não encontrada.`;
    throw new Error(msg);
  }

  if (!data) {
    throw new Error("A API retornou uma resposta inválida. Verifique a URL configurada para a API.");
  }

  return data;
}

export const api = {
  // Projetos
  listarProjetos: () =>
    fetch(`${BASE}/projetos`, { headers: authHeaders() }).then(handle),
  criarProjeto: (payload) =>
    fetch(`${BASE}/projetos`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    }).then(handle),
  excluirProjeto: (id) =>
    fetch(`${BASE}/projetos/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then(handle),
  editarProjeto: (id, payload) =>
    fetch(`${BASE}/projetos/${id}`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    }).then(handle),

  // Cursos
  listarCursos: (projetoId) =>
    fetch(`${BASE}/projetos/${projetoId}/cursos`, {
      headers: authHeaders(),
    }).then(handle),
  criarCurso: (projetoId, payload) =>
    fetch(`${BASE}/projetos/${projetoId}/cursos`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    }).then(handle),
  excluirCurso: (cursoId) =>
    fetch(`${BASE}/cursos/${cursoId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then(handle),

  // Alunos
  listarAlunos: (cursoId) =>
    fetch(`${BASE}/cursos/${cursoId}/alunos`, {
      headers: authHeaders(),
    }).then(handle),
  criarAluno: (cursoId, payload) =>
    fetch(`${BASE}/cursos/${cursoId}/alunos`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    }).then(handle),
  excluirAluno: (alunoId) =>
    fetch(`${BASE}/alunos/${alunoId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then(handle),

  // Listas (PDF)
  urlListaPdf: (cursoId, titulo, data) =>
    `${BASE}/cursos/${cursoId}/lista/pdf?titulo=${encodeURIComponent(
      titulo
    )}&data=${encodeURIComponent(data)}&token=${encodeURIComponent(
      getToken() || ""
    )}`,

  // Exportação para Excel
  urlAlunosExcel: (cursoId) =>
    `${BASE}/cursos/${cursoId}/alunos/excel?token=${encodeURIComponent(
      getToken() || ""
    )}`,

  // Instrutores
  listarInstrutores: () =>
    fetch(`${BASE}/instrutores`, { headers: authHeaders() }).then(handle),
  criarInstrutor: (payload) =>
    fetch(`${BASE}/instrutores`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    }).then(handle),
  excluirInstrutor: (id) =>
    fetch(`${BASE}/instrutores/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then(handle),

  // Financeiro
  listarFinanceiro: (projetoId) =>
    fetch(`${BASE}/projetos/${projetoId}/financeiro`, {
      headers: authHeaders(),
    }).then(handle),
  criarFinanceiro: (projetoId, formData) =>
    fetch(`${BASE}/projetos/${projetoId}/financeiro`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    }).then(handle),
  excluirFinanceiro: (id) =>
    fetch(`${BASE}/financeiro/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then(handle),
  urlNf: (id) =>
    `${BASE}/financeiro/${id}/nf?token=${encodeURIComponent(getToken() || "")}`,

  obterConfiguracaoInstitucional: () => fetch(`${BASE}/configuracao-institucional`, { headers: authHeaders() }).then(handle),
  salvarConfiguracaoInstitucional: (payload) => fetch(`${BASE}/configuracao-institucional`, { method: "PUT", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) }).then(handle),
  listarSolicitacoesFinanceiras: (projetoId, cursoId = "") => fetch(`${BASE}/projetos/${projetoId}/solicitacoes-financeiras${cursoId ? `?curso_id=${cursoId}` : ""}`, { headers: authHeaders() }).then(handle),
  criarSolicitacaoFinanceira: (projetoId, payload) => fetch(`${BASE}/projetos/${projetoId}/solicitacoes-financeiras`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) }).then(handle),
  excluirSolicitacaoFinanceira: (id) => fetch(`${BASE}/solicitacoes-financeiras/${id}`, { method: "DELETE", headers: authHeaders() }).then(handle),
  urlSolicitacaoFinanceiraPdf: (id) => `${BASE}/solicitacoes-financeiras/${id}/pdf?token=${encodeURIComponent(getToken() || "")}`,

  // Conta
  trocarSenha: (payload) =>
    fetch(`${BASE}/auth/senha`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    }).then(handle),
};

export default api;
