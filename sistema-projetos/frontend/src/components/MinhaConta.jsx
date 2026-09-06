import { useEffect, useState } from "react";
import { api } from "../api";

export default function MinhaConta({ usuario }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [usuarios,setUsuarios]=useState([]),[novo,setNovo]=useState({nome:"",usuario:"",senha:"",perfil:"Pedagógico"});
  const carregarUsuarios=()=>((usuario?.perfil||"Administrador")==="Administrador")&&api.listarUsuarios().then(setUsuarios).catch(e=>setErro(e.message));
  useEffect(carregarUsuarios,[usuario?.perfil]);
  const criarUsuario=async(e)=>{e.preventDefault();setErro("");try{await api.criarUsuario(novo);setNovo({nome:"",usuario:"",senha:"",perfil:"Pedagógico"});carregarUsuarios();}catch(x){setErro(x.message);}};

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
      {(usuario?.perfil||"Administrador")==="Administrador"&&<><div className="section-title">Usuários e permissões</div><form onSubmit={criarUsuario}><div className="form-grid"><div className="field"><label>Nome</label><input required value={novo.nome} onChange={e=>setNovo({...novo,nome:e.target.value})}/></div><div className="field"><label>Login</label><input required value={novo.usuario} onChange={e=>setNovo({...novo,usuario:e.target.value})}/></div><div className="field"><label>Senha inicial</label><input required minLength="6" type="password" value={novo.senha} onChange={e=>setNovo({...novo,senha:e.target.value})}/></div><div className="field"><label>Perfil</label><select value={novo.perfil} onChange={e=>setNovo({...novo,perfil:e.target.value})}>{["Administrador","Pedagógico","Financeiro"].map(p=><option key={p}>{p}</option>)}</select></div></div><button className="btn amber">Criar usuário</button></form><div className="table-wrap"><table><thead><tr><th>Nome</th><th>Login</th><th>Perfil</th></tr></thead><tbody>{usuarios.map(u=><tr key={u.id}><td>{u.nome}</td><td>{u.usuario}</td><td><select value={u.perfil} disabled={u.id===usuario.id} onChange={async e=>{try{await api.alterarPerfilUsuario(u.id,e.target.value);carregarUsuarios();}catch(x){setErro(x.message);}}}>{["Administrador","Pedagógico","Financeiro"].map(p=><option key={p}>{p}</option>)}</select></td></tr>)}</tbody></table></div></>}
    </div>
  );
}
