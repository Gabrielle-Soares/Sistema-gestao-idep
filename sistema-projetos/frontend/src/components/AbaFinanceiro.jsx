import { useEffect, useState } from "react";
import { api } from "../api";

export default function AbaFinanceiro({ projeto }) {
  const [registros, setRegistros] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [origemId, setOrigemId] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const carregar = () => {
    setCarregando(true);
    Promise.all([api.listarFinanceiro(projeto.id), api.listarProjetos()])
      .then(([fin, todosProjetos]) => {
        setRegistros(fin);
        setProjetos(todosProjetos);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, [projeto.id]);

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const formData = new FormData();
      if (origemId) formData.append("origem_projeto_id", origemId);
      if (arquivo) formData.append("nf", arquivo);
      await api.criarFinanceiro(projeto.id, formData);
      setOrigemId("");
      setArquivo(null);
      document.getElementById("nf-input").value = "";
      carregar();
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  };

  const excluir = async (id) => {
    if (!confirm("Excluir este lancamento financeiro?")) return;
    await api.excluirFinanceiro(id);
    carregar();
  };

  return (
    <div>
      <div className="section-title">Novo lancamento ({projeto.nome})</div>
      <form onSubmit={enviar}>
        <div className="form-grid">
          <div className="field">
            <label>Origem (projeto vinculado)</label>
            <select value={origemId} onChange={(e) => setOrigemId(e.target.value)}>
              <option value="">Selecione um projeto de origem</option>
              {projetos
                .filter((p) => p.id !== projeto.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label>Nota fiscal (anexo)</label>
            <input id="nf-input" type="file" onChange={(e) => setArquivo(e.target.files[0])} />
          </div>
        </div>
        {erro && <div className="banner">{erro}</div>}
        <button className="btn amber" type="submit" disabled={enviando}>
          {enviando ? "Enviando..." : "+ Registrar lancamento"}
        </button>
      </form>

      <div className="section-title">Lancamentos registrados</div>
      {carregando && <p className="mono">carregando...</p>}
      {!carregando && registros.length === 0 && (
        <div className="empty-state">Nenhum lancamento financeiro registrado ainda.</div>
      )}
      {registros.map((r) => (
        <div className="card" key={r.id}>
          <div className="card-row">
            <div>
              <h3>{r.origem_nome ? `Origem: ${r.origem_nome}` : "Sem origem vinculada"}</h3>
              <div className="meta">
                {r.nf_nome_original ? `NF anexada: ${r.nf_nome_original}` : "Nenhuma NF anexada"}
              </div>
              <div className="meta mono">registrado em {r.criado_em}</div>
            </div>
            <div className="actions-row">
              {r.nf_arquivo && (
                <a className="btn small secondary" href={api.urlNf(r.id)} target="_blank" rel="noreferrer">
                  Baixar NF
                </a>
              )}
              <button className="btn small danger" onClick={() => excluir(r.id)}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
