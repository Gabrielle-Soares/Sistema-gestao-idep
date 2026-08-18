import { useState } from "react";
import { api } from "../api";

export default function MinhaConta({ usuario }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [enviando, setEnviando] = useState(false);

  const trocarSenha = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErro("Preencha todos os campos.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setEnviando(true);
    try {
      await api.trocarSenha({ senhaAtual, novaSenha });
      setSucesso("Senha atualizada com sucesso.");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <div className="section-title">Dados da conta</div>
      <div className="card">
        <div className="meta">Usuário</div>
        <h3>{usuario?.nome}</h3>
        <div className="meta mono">login: {usuario?.usuario}</div>
      </div>

      <div className="section-title">Trocar senha</div>
      <form onSubmit={trocarSenha} className="form-grid single" style={{ maxWidth: 360 }}>
        <div className="field">
          <label>Senha atual</label>
          <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
        </div>
        <div className="field">
          <label>Nova senha</label>
          <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
        </div>
        <div className="field">
          <label>Confirmar nova senha</label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
          />
        </div>
      </form>

      {erro && <div className="banner">{erro}</div>}
      {sucesso && <div className="banner banner-ok">{sucesso}</div>}

      <button className="btn amber" onClick={trocarSenha} disabled={enviando}>
        {enviando ? "Salvando..." : "Salvar nova senha"}
      </button>
    </div>
  );
}
