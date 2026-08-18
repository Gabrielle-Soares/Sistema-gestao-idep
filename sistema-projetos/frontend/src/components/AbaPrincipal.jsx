import { useEffect, useState } from "react";
import { api } from "../api";

function ProjetoCard({ projeto, onAbrirProjeto, onMudou }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(projeto.nome);
  const [descricao, setDescricao] = useState(projeto.descricao || "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!nome.trim()) {
      setErro("Informe o nome do projeto.");
      return;
    }
    setSalvando(true);
    try {
      await api.editarProjeto(projeto.id, { nome, descricao });
      setEditando(false);
      onMudou();
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setSalvando(false);
    }
  };

  const cancelar = () => {
    setNome(projeto.nome);
    setDescricao(projeto.descricao || "");
    setErro("");
    setEditando(false);
  };

  const excluir = async () => {
    if (!confirm("Excluir este projeto e todos os dados vinculados (cursos, alunos, financeiro)?")) return;
    await api.excluirProjeto(projeto.id);
    onMudou();
  };

  if (editando) {
    return (
      <div className="card">
        <form onSubmit={salvar}>
          <div className="form-grid">
            <div className="field">
              <label>Nome do projeto</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label>Descrição (opcional)</label>
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>
          {erro && <div className="banner">{erro}</div>}
          <div className="actions-row">
            <button className="btn small amber" type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button className="btn small secondary" type="button" onClick={cancelar}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-row">
        <div>
          <h3>{projeto.nome}</h3>
          {projeto.descricao && <div className="meta">{projeto.descricao}</div>}
          <div className="meta mono">criado em {projeto.criado_em}</div>
        </div>
        <div className="actions-row">
          <button className="btn small" onClick={() => onAbrirProjeto(projeto)}>
            Abrir
          </button>
          <button className="btn small secondary" onClick={() => setEditando(true)}>
            Editar
          </button>
          <button className="btn small danger" onClick={excluir}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AbaPrincipal({ onAbrirProjeto }) {
  const [projetos, setProjetos] = useState([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    api
      .listarProjetos()
      .then(setProjetos)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, []);

  const criar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!nome.trim()) {
      setErro("Informe o nome do projeto.");
      return;
    }
    try {
      await api.criarProjeto({ nome, descricao });
      setNome("");
      setDescricao("");
      carregar();
    } catch (e2) {
      setErro(e2.message);
    }
  };

  return (
    <div>
      <div className="section-title">Novo projeto</div>
      <form onSubmit={criar}>
        <div className="form-grid">
          <div className="field">
            <label>Nome do projeto</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Formação Digital 2026" />
          </div>
          <div className="field">
            <label>Descrição (opcional)</label>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Breve descrição" />
          </div>
        </div>
        {erro && <div className="banner">{erro}</div>}
        <button className="btn amber" type="submit">
          + Criar projeto
        </button>
      </form>

      <div className="section-title">Projetos cadastrados</div>
      {carregando && <p className="mono">carregando...</p>}
      {!carregando && projetos.length === 0 && (
        <div className="empty-state">Nenhum projeto cadastrado ainda. Crie o primeiro acima.</div>
      )}
      {projetos.map((p) => (
        <ProjetoCard key={p.id} projeto={p} onAbrirProjeto={onAbrirProjeto} onMudou={carregar} />
      ))}
    </div>
  );
}
