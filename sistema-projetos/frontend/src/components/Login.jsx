import { useState } from "react";
import { login } from "../auth";

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!usuario.trim() || !senha) {
      setErro("Informe usuario e senha.");
      return;
    }
    setEnviando(true);
    try {
      const dadosUsuario = await login(usuario.trim(), senha);
      onLogin(dadosUsuario);
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={entrar}>
        <div className="login-badge">IDEP</div>
        <div className="eyebrow" style={{ textAlign: "center", marginBottom: 4 }}>
          Sistema de Gestao
        </div>
        <h1 style={{ textAlign: "center", marginBottom: 22 }}>Projetos &amp; Cursos</h1>

        <div className="field" style={{ marginBottom: 12 }}>
          <label>Usuario</label>
          <input
            autoFocus
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="admin"
          />
        </div>
        <div className="field" style={{ marginBottom: 6 }}>
          <label>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {erro && <div className="banner" style={{ marginTop: 12 }}>{erro}</div>}

        <button className="btn amber" type="submit" disabled={enviando} style={{ width: "100%", marginTop: 16 }}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
