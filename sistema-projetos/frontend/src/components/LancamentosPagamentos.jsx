import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import GestaoPagamentos from "./GestaoPagamentos";

const hoje = () => new Date().toISOString().slice(0, 10);
const moeda = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const vazio = () => ({ tipo_pagamento: "Funcionário", funcionario_id: "", prestador_nome: "", cpf_cnpj: "", projeto_id: "", competencia: "", data_pagamento: hoje(), descricao: "", categoria_detalhe: "", valor: "", status: "Pendente", responsavel: "", observacoes: "", anexo: null });

export default function LancamentosPagamentos() {
  const [area, setArea] = useState("lancamentos");
  const [funcionarios, setFuncionarios] = useState([]), [projetos, setProjetos] = useState([]), [lancamentos, setLancamentos] = useState([]);
  const [form, setForm] = useState(vazio()), [editId, setEditId] = useState(null), [erro, setErro] = useState(""), [sucesso, setSucesso] = useState("");
  const [filtros, setFiltros] = useState({ tipo: "", projeto: "", inicio: "", fim: "", pessoa: "" });
  const carregar = async () => { try { const [f, p, l] = await Promise.all([api.listarFuncionarios(), api.listarProjetos(), api.listarLancamentosFinanceiros()]); setFuncionarios(f); setProjetos(p); setLancamentos(l); } catch (e) { setErro(e.message); } };
  useEffect(() => { carregar(); }, []);
  const lista = useMemo(() => lancamentos.filter((p) => (!filtros.tipo || p.tipo_pagamento === filtros.tipo) && (!filtros.projeto || String(p.projeto_id) === filtros.projeto) && (!filtros.inicio || p.data_pagamento >= filtros.inicio) && (!filtros.fim || p.data_pagamento <= filtros.fim) && (!filtros.pessoa || String(p.beneficiario || "").toLocaleLowerCase().includes(filtros.pessoa.toLocaleLowerCase()))), [lancamentos, filtros]);
  const mudar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const cancelar = () => { setEditId(null); setForm(vazio()); };
  const salvar = async (e) => { e.preventDefault(); setErro(""); try { if (editId) await api.editarLancamentoFinanceiro(editId, form); else { const dados = new FormData(); Object.entries(form).forEach(([k, v]) => { if (k !== "anexo" && v !== "") dados.append(k, v); }); if (form.anexo) dados.append("anexo", form.anexo); if (form.tipo_pagamento === "Funcionário") await api.criarPagamentoFuncionario(dados); else await api.criarLancamentoFinanceiro(dados); } cancelar(); await carregar(); setSucesso("Lançamento salvo com sucesso."); setTimeout(() => setSucesso(""), 3000); } catch (x) { setErro(x.message); } };
  if (area === "cadastros") return <><button className="btn small secondary" onClick={() => setArea("lancamentos")}>← Voltar aos lançamentos</button><GestaoPagamentos /></>;
  return <div>
    <div className="subnav"><button className="btn small">Lançamentos</button><button className="btn small secondary" onClick={() => setArea("cadastros")}>Funcionários e auxílio</button></div>
    {erro && <div className="banner">{erro}</div>}{sucesso && <div className="banner banner-ok">{sucesso}</div>}
    <div className="section-title">{editId ? "Editar lançamento" : "Novo lançamento financeiro"}</div>
    <form onSubmit={salvar}><div className="form-grid">
      <div className="field"><label>Tipo de pagamento</label><select disabled={Boolean(editId)} value={form.tipo_pagamento} onChange={(e) => setForm({ ...vazio(), tipo_pagamento: e.target.value })}>{["Funcionário", "Prestação de Serviço", "Outros"].map((x) => <option key={x}>{x}</option>)}</select></div>
      {form.tipo_pagamento === "Funcionário" && <div className="field"><label>Funcionário</label><select required value={form.funcionario_id} onChange={(e) => mudar("funcionario_id", e.target.value)}><option value="">Selecione</option>{funcionarios.filter((f) => f.status === "Ativo").map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>}
      {form.tipo_pagamento === "Prestação de Serviço" && <><div className="field"><label>Prestador (opcional)</label><input value={form.prestador_nome} onChange={(e) => mudar("prestador_nome", e.target.value)} /></div><div className="field"><label>CPF/CNPJ (opcional)</label><input value={form.cpf_cnpj} onChange={(e) => mudar("cpf_cnpj", e.target.value)} /></div></>}
      <div className="field"><label>Projeto (opcional)</label><select value={form.projeto_id || ""} onChange={(e) => mudar("projeto_id", e.target.value)}><option value="">Sem projeto</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
      <div className="field"><label>{form.tipo_pagamento === "Prestação de Serviço" ? "Descrição do serviço" : "Descrição"}</label><input required value={form.descricao || ""} onChange={(e) => mudar("descricao", e.target.value)} /></div>
      {form.tipo_pagamento === "Funcionário" && <div className="field"><label>Competência (opcional)</label><input type="month" value={form.competencia} onChange={(e) => mudar("competencia", e.target.value)} /></div>}
      <div className="field"><label>Valor</label><input required min="0" step="0.01" type="number" value={form.valor || ""} onChange={(e) => mudar("valor", e.target.value)} /></div>
      <div className="field"><label>Data</label><input required type="date" value={form.data_pagamento || ""} onChange={(e) => mudar("data_pagamento", e.target.value)} /></div>
      <div className="field"><label>Status</label><select value={form.status} onChange={(e) => mudar("status", e.target.value)}>{["Pendente", "Programado", "Pago", "Cancelado"].map((x) => <option key={x}>{x}</option>)}</select></div>
      {form.tipo_pagamento === "Outros" && <div className="field"><label>Categoria (opcional)</label><input placeholder="Ex.: combustível, material, taxa" value={form.categoria_detalhe} onChange={(e) => mudar("categoria_detalhe", e.target.value)} /></div>}
      {!editId && <div className="field"><label>Comprovante (opcional)</label><input type="file" onChange={(e) => mudar("anexo", e.target.files[0] || null)} /></div>}
      <div className="field form-grid-full"><label>Observações</label><textarea value={form.observacoes || ""} onChange={(e) => mudar("observacoes", e.target.value)} /></div>
    </div><div className="actions-row"><button className="btn amber">{editId ? "Salvar alterações" : "Registrar pagamento"}</button>{editId && <button type="button" className="btn secondary" onClick={cancelar}>Cancelar</button>}</div></form>
    <div className="section-title">Lançamentos registrados</div><div className="form-grid">
      <div className="field"><label>Tipo</label><select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}><option value="">Todos</option>{["Funcionário", "Prestação de Serviço", "Outros", "Auxílio"].map((x) => <option key={x}>{x}</option>)}</select></div>
      <div className="field"><label>Projeto</label><select value={filtros.projeto} onChange={(e) => setFiltros({ ...filtros, projeto: e.target.value })}><option value="">Todos</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
      <div className="field"><label>De</label><input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} /></div><div className="field"><label>Até</label><input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} /></div>
      <div className="field"><label>Funcionário/prestador</label><input value={filtros.pessoa} onChange={(e) => setFiltros({ ...filtros, pessoa: e.target.value })} /></div>
    </div><div className="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Beneficiário</th><th>Projeto</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{lista.map((p) => <tr key={p.id}><td>{p.data_pagamento || "-"}</td><td>{p.descricao || p.categoria}</td><td>{p.tipo_pagamento || p.categoria}</td><td>{p.beneficiario || "-"}</td><td>{p.projeto_nome || "-"}</td><td>{moeda(p.valor)}</td><td>{p.status || "-"}</td><td><div className="actions-row">{p.nf_arquivo && <a className="btn small secondary" href={api.urlNf(p.id)} target="_blank" rel="noreferrer">Comprovante</a>}{["Prestação de Serviço", "Outros"].includes(p.tipo_pagamento) && !p.funcionario_id && !p.folha_auxilio_id && <button className="btn small secondary" onClick={() => { setEditId(p.id); setForm({ ...vazio(), ...p, anexo: null }); }}>Editar</button>}</div></td></tr>)}</tbody></table></div>{!lista.length && <div className="empty-state">Nenhum lançamento encontrado.</div>}
  </div>;
}
