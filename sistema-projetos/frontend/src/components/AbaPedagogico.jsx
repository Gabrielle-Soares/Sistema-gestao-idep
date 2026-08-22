import { useEffect, useState } from "react";
import { api } from "../api";

const FORM_ALUNO_VAZIO = {
  nome: "",
  nis: "",
  cpf: "",
  chave_pix: "",
  data_nascimento: "",
  telefone: "",
  endereco: "",
  escolaridade: "",
  renda_familiar: "",
  cor_raca: "",
  genero: "",
  comunidade_tradicional: "",
  pcd: "",
  lgbt: "",
  observacoes: "",
  tipo: "aluno",
};

const OPCOES_ESCOLARIDADE = [
  "Fundamental incompleto",
  "Fundamental completo",
  "Médio incompleto",
  "Médio completo",
  "Superior incompleto",
  "Superior completo",
  "Pós-graduação",
];

const OPCOES_RENDA = [
  "Até 1 salário mínimo",
  "De 1 a 2 salários mínimos",
  "De 2 a 3 salários mínimos",
  "Acima de 3 salários mínimos",
  "Não informado",
];

const OPCOES_COR_RACA = ["Branca", "Preta", "Parda", "Amarela", "Indígena", "Não declarado"];

const OPCOES_GENERO = ["Feminino", "Masculino", "Não binário", "Prefere não informar", "Outro"];

const OPCOES_COMUNIDADE = ["Não", "Quilombola", "Indígena", "Ribeirinha", "Outra"];

const OPCOES_SIM_NAO = ["Não informado", "Sim", "Não"];

function CursoCard({ curso, onExcluirCurso }) {
  const [aberto, setAberto] = useState(false);
  const [alunos, setAlunos] = useState([]);
  const [formAluno, setFormAluno] = useState(FORM_ALUNO_VAZIO);
  const [mostrarComplementares, setMostrarComplementares] = useState(false);
  const [erro, setErro] = useState("");

  const [tituloLista, setTituloLista] = useState(`Lista - ${curso.nome}`);
  const [dataLista, setDataLista] = useState(() => new Date().toISOString().slice(0, 10));

  const carregarAlunos = () => {
    api.listarAlunos(curso.id).then(setAlunos).catch((e) => setErro(e.message));
  };

  useEffect(() => {
    if (aberto) carregarAlunos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const atualizarCampoAluno = (campo) => (e) =>
    setFormAluno((f) => ({ ...f, [campo]: e.target.value }));

  const adicionarAluno = async (e) => {
    e.preventDefault();
    setErro("");
    if (!formAluno.nome.trim()) {
      setErro("Informe o nome.");
      return;
    }
    try {
      await api.criarAluno(curso.id, formAluno);
      setFormAluno(FORM_ALUNO_VAZIO);
      carregarAlunos();
    } catch (e2) {
      setErro(e2.message);
    }
  };

  const removerAluno = async (id) => {
    await api.excluirAluno(id);
    carregarAlunos();
  };

  const gerarPdf = () => {
    const url = api.urlListaPdf(curso.id, tituloLista, dataLista);
    window.open(url, "_blank");
  };

  const exportarExcel = () => {
    window.open(api.urlAlunosExcel(curso.id), "_blank");
  };

  return (
    <div className="card">
      <div className="card-row">
        <div>
          <h3>{curso.nome}</h3>
          <div className="meta">
            Instrutor: {curso.instrutor_nome || "-"} &nbsp;|&nbsp; Carga horária: {curso.carga_horaria || "-"}
          </div>
          <div className="meta">
            Local: {curso.local || "-"} &nbsp;|&nbsp; Município: {curso.municipio || "-"} &nbsp;|&nbsp; Horário:{" "}
            {curso.horario || "-"}
          </div>
        </div>
        <div className="actions-row">
          <button className="btn small" onClick={() => setAberto((v) => !v)}>
            {aberto ? "Fechar" : "Gerenciar alunos / lista"}
          </button>
          <button className="btn small danger" onClick={() => onExcluirCurso(curso.id)}>
            Excluir
          </button>
        </div>
      </div>

      {aberto && (
        <div style={{ marginTop: 16, borderTop: "1px dashed var(--line)", paddingTop: 14 }}>
          <form onSubmit={adicionarAluno} className="form-grid" style={{ marginBottom: 10 }}>
            <div className="field">
              <label>Nome do aluno / ouvinte</label>
              <input
                value={formAluno.nome}
                onChange={atualizarCampoAluno("nome")}
                placeholder="Nome completo"
              />
            </div>
            <div className="field">
              <label>NIS</label>
              <input
                value={formAluno.nis}
                onChange={atualizarCampoAluno("nis")}
                placeholder="Número de Identificação Social"
                inputMode="numeric"
              />
            </div>
            <div className="field">
              <label>CPF</label>
              <input
                value={formAluno.cpf}
                onChange={atualizarCampoAluno("cpf")}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </div>
            <div className="field">
              <label>Data de nascimento</label>
              <input type="date" value={formAluno.data_nascimento} onChange={atualizarCampoAluno("data_nascimento")} />
            </div>
            <div className="field">
              <label>Chave Pix</label>
              <input value={formAluno.chave_pix} onChange={atualizarCampoAluno("chave_pix")} placeholder="CPF, telefone, e-mail ou chave aleatória" />
            </div>
            <div className="field">
              <label>Telefone / WhatsApp</label>
              <input
                value={formAluno.telefone}
                onChange={atualizarCampoAluno("telefone")}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={formAluno.tipo} onChange={atualizarCampoAluno("tipo")}>
                <option value="aluno">Aluno</option>
                <option value="ouvinte">Ouvinte</option>
              </select>
            </div>
          </form>

          <button
            type="button"
            className="btn small secondary"
            style={{ marginBottom: 10 }}
            onClick={() => setMostrarComplementares((v) => !v)}
          >
            {mostrarComplementares ? "Ocultar dados complementares" : "+ Dados complementares"}
          </button>

          {mostrarComplementares && (
            <div className="form-grid" style={{ marginBottom: 10 }}>
              <div className="field">
                <label>Endereço</label>
                <input value={formAluno.endereco} onChange={atualizarCampoAluno("endereco")} placeholder="Rua, número, bairro" />
              </div>
              <div className="field">
                <label>Escolaridade</label>
                <select value={formAluno.escolaridade} onChange={atualizarCampoAluno("escolaridade")}>
                  <option value="">Não informado</option>
                  {OPCOES_ESCOLARIDADE.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Renda familiar</label>
                <select value={formAluno.renda_familiar} onChange={atualizarCampoAluno("renda_familiar")}>
                  <option value="">Não informado</option>
                  {OPCOES_RENDA.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Cor / Raça</label>
                <select value={formAluno.cor_raca} onChange={atualizarCampoAluno("cor_raca")}>
                  <option value="">Não informado</option>
                  {OPCOES_COR_RACA.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Gênero</label>
                <select value={formAluno.genero} onChange={atualizarCampoAluno("genero")}>
                  <option value="">Não informado</option>
                  {OPCOES_GENERO.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Comunidade tradicional</label>
                <select value={formAluno.comunidade_tradicional} onChange={atualizarCampoAluno("comunidade_tradicional")}>
                  <option value="">Não informado</option>
                  {OPCOES_COMUNIDADE.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>PCD</label>
                <select value={formAluno.pcd} onChange={atualizarCampoAluno("pcd")}>
                  {OPCOES_SIM_NAO.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>LGBT</label>
                <select value={formAluno.lgbt} onChange={atualizarCampoAluno("lgbt")}>
                  {OPCOES_SIM_NAO.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              <div className="field form-grid-full">
                <label>Observações</label>
                <textarea
                  rows={3}
                  value={formAluno.observacoes}
                  onChange={atualizarCampoAluno("observacoes")}
                  placeholder="Observações gerais sobre o aluno"
                />
              </div>
            </div>
          )}

          {erro && <div className="banner">{erro}</div>}
          <button className="btn small secondary" onClick={adicionarAluno} style={{ marginBottom: 12 }}>
            + Adicionar
          </button>

          {alunos.length === 0 ? (
            <div className="empty-state">Nenhum aluno ou ouvinte cadastrado neste curso.</div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {alunos.map((a) => (
                <div key={a.id} className="aluno-row">
                  <div>
                    <div>
                      {a.nome} <span className={`tag ${a.tipo}`}>{a.tipo}</span>
                    </div>
                    <div className="mono" style={{ color: "var(--ink-soft)", fontSize: 12, marginTop: 3 }}>
                      {a.nis && <span>NIS {a.nis}  </span>}
                      {a.cpf && <span>· CPF {a.cpf}  </span>}
                      {a.data_nascimento && <span>· Nasc. {a.data_nascimento}  </span>}
                      {a.telefone && <span>· {a.telefone}</span>}
                    </div>
                  </div>
                  <button className="btn small danger" onClick={() => removerAluno(a.id)}>
              Remover
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="section-title">Exportar dados dos alunos</div>
          <div className="actions-row" style={{ marginBottom: 4 }}>
            <button className="btn small secondary" onClick={exportarExcel}>
              Exportar para Excel
            </button>
          </div>

          <div className="section-title">Gerar lista para assinatura (PDF)</div>
          <div className="form-grid">
            <div className="field">
            <label>Título da lista</label>
              <input value={tituloLista} onChange={(e) => setTituloLista(e.target.value)} />
            </div>
            <div className="field">
              <label>Data</label>
              <input type="date" value={dataLista} onChange={(e) => setDataLista(e.target.value)} />
            </div>
          </div>
          <div className="signature-hint">
            O PDF gerado inclui nome, NIS, tipo (aluno/ouvinte) e espaço para assinatura de cada participante.
          </div>
          <button className="btn amber" style={{ marginTop: 10 }} onClick={gerarPdf}>
            Gerar lista em PDF
          </button>
        </div>
      )}
    </div>
  );
}

function Instrutores({ instrutores, onMudou }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");

  const adicionar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!nome.trim()) {
      setErro("Informe o nome do instrutor.");
      return;
    }
    try {
      await api.criarInstrutor({ nome });
      setNome("");
      onMudou();
    } catch (e2) {
      setErro(e2.message);
    }
  };

  const remover = async (id) => {
    if (!confirm("Excluir este instrutor? Cursos que o usam ficam sem instrutor definido.")) return;
    await api.excluirInstrutor(id);
    onMudou();
  };

  return (
    <div className="card" style={{ background: "#f3ede0" }}>
      <div className="card-row">
        <h3 style={{ fontSize: 14 }}>Instrutores cadastrados</h3>
        <button className="btn small secondary" onClick={() => setAberto((v) => !v)}>
          {aberto ? "Fechar" : "Gerenciar instrutores"}
        </button>
      </div>

      {aberto && (
        <div style={{ marginTop: 12 }}>
          <form onSubmit={adicionar} className="actions-row" style={{ marginBottom: 10 }}>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do instrutor"
              style={{
                flex: 1,
                minWidth: 160,
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: "9px 10px",
              }}
            />
            <button className="btn small amber" type="submit">
              + Adicionar
            </button>
          </form>
          {erro && <div className="banner">{erro}</div>}

          {instrutores.length === 0 ? (
            <div className="empty-state">Nenhum instrutor cadastrado ainda.</div>
          ) : (
            instrutores.map((i) => (
              <div key={i.id} className="aluno-row">
                <span>{i.nome}</span>
                <button className="btn small danger" onClick={() => remover(i.id)}>
                  Remover
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AbaPedagogico({ projeto }) {
  const [cursos, setCursos] = useState([]);
  const [instrutores, setInstrutores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    nome: "",
    carga_horaria: "",
    instrutor_id: "",
    local: "",
    municipio: "",
    horario: "",
    programa_social: "",
  });

  const carregar = () => {
    setCarregando(true);
    Promise.all([api.listarCursos(projeto.id), api.listarInstrutores()])
      .then(([cursosData, instrutoresData]) => {
        setCursos(cursosData);
        setInstrutores(instrutoresData);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  };

  const recarregarInstrutores = () => {
    api.listarInstrutores().then(setInstrutores).catch((e) => setErro(e.message));
  };

  useEffect(carregar, [projeto.id]);

  const atualizarCampo = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const criarCurso = async (e) => {
    e.preventDefault();
    setErro("");
    if (!form.nome.trim()) {
      setErro("Informe o nome do curso.");
      return;
    }
    try {
      await api.criarCurso(projeto.id, { ...form, instrutor_id: form.instrutor_id || null });
      setForm({ nome: "", carga_horaria: "", instrutor_id: "", local: "", municipio: "", horario: "", programa_social: "" });
      carregar();
    } catch (e2) {
      setErro(e2.message);
    }
  };

  const excluirCurso = async (id) => {
    if (!confirm("Excluir este curso e todos os alunos/listas vinculados?")) return;
    await api.excluirCurso(id);
    carregar();
  };

  return (
    <div>
      <Instrutores instrutores={instrutores} onMudou={recarregarInstrutores} />

      <div className="section-title">Novo curso ({projeto.nome})</div>
      <form onSubmit={criarCurso}>
        <div className="form-grid">
          <div className="field">
            <label>Curso</label>
            <input value={form.nome} onChange={atualizarCampo("nome")} placeholder="Nome do curso" />
          </div>
          <div className="field">
            <label>Carga horária</label>
            <input value={form.carga_horaria} onChange={atualizarCampo("carga_horaria")} placeholder="Ex: 40h" />
          </div>
          <div className="field">
            <label>Instrutor</label>
            <select value={form.instrutor_id} onChange={atualizarCampo("instrutor_id")}>
              <option value="">Selecione um instrutor</option>
              {instrutores.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Local</label>
            <input value={form.local} onChange={atualizarCampo("local")} placeholder="Local do curso" />
          </div>
          <div className="field">
            <label>Município</label>
            <input value={form.municipio} onChange={atualizarCampo("municipio")} placeholder="Município" />
          </div>
          <div className="field">
            <label>Horário</label>
            <input value={form.horario} onChange={atualizarCampo("horario")} placeholder="Ex: 19h-22h" />
          </div>
          <div className="field">
            <label>Programa social</label>
            <input list="programas-sociais-curso" value={form.programa_social} onChange={atualizarCampo("programa_social")} placeholder="Selecione ou digite" />
          </div>
        </div>
        {erro && <div className="banner">{erro}</div>}
        <button className="btn amber" type="submit">
          + Adicionar curso
        </button>
      </form>

      <div className="section-title">Cursos cadastrados</div>
      {carregando && <p className="mono">carregando...</p>}
      {!carregando && cursos.length === 0 && (
        <div className="empty-state">Nenhum curso cadastrado neste projeto ainda.</div>
      )}
      {cursos.map((c) => (
        <CursoCard key={c.id} curso={c} onExcluirCurso={excluirCurso} />
      ))}
    </div>
  );
}
