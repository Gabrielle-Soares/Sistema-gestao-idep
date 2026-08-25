import { useEffect, useState } from "react";
import Login from "./components/Login.jsx";
import AbaPrincipal from "./components/AbaPrincipal.jsx";
import AbaPedagogico from "./components/AbaPedagogico.jsx";
import AbaFinanceiro from "./components/AbaFinanceiro.jsx";
import MinhaConta from "./components/MinhaConta.jsx";
import LancamentosPagamentos from "./components/LancamentosPagamentos.jsx";
import { getUsuario, isAuthenticated, logout } from "./auth";
import { api } from "./api";

const ETAPAS = [
  { id: "principal", label: "Principal", precisaProjeto: false },
  { id: "pedagogico", label: "Pedagógico", precisaProjeto: true },
  { id: "financeiro", label: "Financeiro", precisaProjeto: false },
  { id: "pagamentos", label: "Pagamentos", precisaProjeto: false },
];

const TITULOS = {
  principal: "Principal",
  pedagogico: "Pedagógico",
  financeiro: "Financeiro",
  pagamentos: "Funcionários e auxílio-transporte",
  conta: "Minha Conta",
};

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(() => (isAuthenticated() ? getUsuario() : null));
  const [projetoAtivo, setProjetoAtivo] = useState(null);
  const [projetoFinanceiro, setProjetoFinanceiro] = useState(null);
  const [projetosFinanceiro, setProjetosFinanceiro] = useState([]);
  const [aba, setAba] = useState("principal");

  useEffect(() => {
    if (usuarioLogado) api.listarProjetos().then(setProjetosFinanceiro).catch(() => setProjetosFinanceiro([]));
  }, [usuarioLogado]);

  if (!usuarioLogado) {
    return <Login onLogin={setUsuarioLogado} />;
  }

  const abrirProjeto = (projeto) => {
    setProjetoAtivo(projeto);
    setAba("pedagogico");
  };

  const voltarParaProjetos = () => {
    setProjetoAtivo(null);
    setAba("principal");
  };

  const sair = () => {
    logout();
    setUsuarioLogado(null);
    setProjetoAtivo(null);
    setAba("principal");
  };

  const indiceAtual = ETAPAS.findIndex((e) => e.id === aba);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">IDEP</div>
          <div>
            <div className="eyebrow">Sistema de Gestão</div>
            <div className="brand-title">Projetos</div>
          </div>
        </div>

        {projetoAtivo && (
          <div className="projeto-ativo">
            <div className="eyebrow">Projeto atual</div>
            <div className="projeto-ativo-nome">{projetoAtivo.nome}</div>
            <button className="btn secondary small" onClick={voltarParaProjetos}>
              Trocar de projeto
            </button>
          </div>
        )}

        <nav className="trilha" aria-label="Etapas do projeto">
          {ETAPAS.map((etapa, i) => {
            const bloqueada = etapa.precisaProjeto && !projetoAtivo;
            const estado =
              aba !== "conta" && i < indiceAtual ? "feita" : aba === etapa.id ? "atual" : "proxima";
            return (
              <button
                key={etapa.id}
                className={`trilha-item trilha-${estado} ${bloqueada ? "trilha-bloqueada" : ""}`}
                onClick={() => {
                  if (bloqueada) return;
                  if (etapa.id === "financeiro" && !projetoFinanceiro && projetoAtivo) setProjetoFinanceiro(projetoAtivo);
                  setAba(etapa.id);
                }}
                disabled={bloqueada}
                title={bloqueada ? "Abra um projeto primeiro" : ""}
              >
                <span className="trilha-no" aria-hidden="true" />
                <span className="trilha-label">{etapa.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className={`usuario-nome mono ${aba === "conta" ? "usuario-nome-ativo" : ""}`}
            onClick={() => setAba("conta")}
            title="Minha conta"
          >
            {usuarioLogado.nome}
          </button>
          <button className="btn secondary small" onClick={sair}>
            Sair
          </button>
        </div>
      </aside>

      <main className="conteudo">
        <header className="conteudo-header">
          <h1>{TITULOS[aba]}</h1>
        </header>

        <div className="painel">
          {aba === "principal" && <AbaPrincipal onAbrirProjeto={abrirProjeto} />}
          {aba === "pedagogico" && projetoAtivo && <AbaPedagogico projeto={projetoAtivo} />}
          {aba === "financeiro" && <>
            <div className="field" style={{ maxWidth: 460, marginBottom: 20 }}>
              <label>Projeto para o financeiro</label>
              <select value={projetoFinanceiro?.id || ""} onChange={(e) => setProjetoFinanceiro(projetosFinanceiro.find((p) => String(p.id) === e.target.value) || null)}>
                <option value="">Selecione um projeto</option>
                {projetosFinanceiro.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            {projetoFinanceiro ? <AbaFinanceiro projeto={projetoFinanceiro} /> : <div className="empty-state">Selecione um projeto para consultar ou registrar dados financeiros.</div>}
          </>}
          {aba === "conta" && <MinhaConta usuario={usuarioLogado} />}
          {aba === "pagamentos" && <LancamentosPagamentos />}
          {aba === "pedagogico" && !projetoAtivo && (
            <div className="empty-state">Abra um projeto na aba Principal para continuar.</div>
          )}
        </div>
      </main>
    </div>
  );
}
