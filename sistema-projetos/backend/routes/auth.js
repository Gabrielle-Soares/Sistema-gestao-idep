const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { gerarToken, autenticacaoObrigatoria } = require("../auth");

const router = express.Router();

// Login
router.post("/login", async (req, res, next) => { try {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) {
    return res.status(400).json({ erro: "Informe usuário e senha" });
  }

  const registro = (await db.query("SELECT * FROM usuarios WHERE usuario = $1", [usuario.trim()])).rows[0];
  if (!registro) {
    return res.status(401).json({ erro: "Usuário ou senha inválidos" });
  }

  const senhaCorreta = bcrypt.compareSync(senha, registro.senha_hash);
  if (!senhaCorreta) {
    return res.status(401).json({ erro: "Usuário ou senha inválidos" });
  }

  const token = gerarToken(registro);
  res.json({ token, usuario: { id: registro.id, nome: registro.nome, usuario: registro.usuario, perfil: registro.perfil || "Administrador" } }); } catch(e) { next(e); }
});

// Verifica se o token atual ainda e valido e devolve os dados do usuario logado
router.get("/me", autenticacaoObrigatoria, (req, res) => {
  res.json({ usuario: req.usuario });
});

// Trocar a propria senha (tela "Minha Conta")
router.put("/senha", autenticacaoObrigatoria, async (req, res, next) => { try {
  const { senhaAtual, novaSenha } = req.body;
  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ erro: "Informe a senha atual e a nova senha" });
  }
  if (novaSenha.length < 6) {
    return res.status(400).json({ erro: "A nova senha precisa ter pelo menos 6 caracteres" });
  }

  const registro = (await db.query("SELECT * FROM usuarios WHERE id = $1", [req.usuario.id])).rows[0];
  if (!registro) return res.status(404).json({ erro: "Usuário não encontrado" });

  const senhaCorreta = bcrypt.compareSync(senhaAtual, registro.senha_hash);
  if (!senhaCorreta) {
    return res.status(401).json({ erro: "Senha atual incorreta" });
  }

  const novoHash = bcrypt.hashSync(novaSenha, 10);
  await db.query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [novoHash, req.usuario.id]);
  res.json({ ok: true }); } catch(e) { next(e); }
});

// Gestao conservadora de usuarios: nao permite excluir contas ou dados existentes.
router.get("/usuarios", autenticacaoObrigatoria, async (req, res) => {
  if (req.usuario.perfil !== "Administrador") return res.status(403).json({ erro: "Acesso restrito ao administrador" });
  res.json((await db.query("SELECT id,nome,usuario,perfil,criado_em FROM usuarios ORDER BY nome")).rows);
});

router.post("/usuarios", autenticacaoObrigatoria, async (req, res) => {
  if (req.usuario.perfil !== "Administrador") return res.status(403).json({ erro: "Acesso restrito ao administrador" });
  const nome=String(req.body.nome||"").trim(), usuario=String(req.body.usuario||"").trim(), senha=String(req.body.senha||""), perfil=String(req.body.perfil||"");
  if(!nome||!usuario||senha.length<6||!["Administrador","Pedagógico","Financeiro"].includes(perfil)) return res.status(400).json({erro:"Informe nome, usuário, senha de 6 caracteres e perfil válido"});
  const senhaHash=bcrypt.hashSync(senha,10);
  const row=(await db.query("INSERT INTO usuarios(nome,usuario,senha_hash,perfil) VALUES($1,$2,$3,$4) RETURNING id,nome,usuario,perfil,criado_em",[nome,usuario,senhaHash,perfil])).rows[0];
  res.status(201).json(row);
});

router.put("/usuarios/:id/perfil", autenticacaoObrigatoria, async (req, res) => {
  if (req.usuario.perfil !== "Administrador") return res.status(403).json({ erro: "Acesso restrito ao administrador" });
  const perfil=String(req.body.perfil||"");
  if(!["Administrador","Pedagógico","Financeiro"].includes(perfil)) return res.status(400).json({erro:"Perfil inválido"});
  if(String(req.usuario.id)===String(req.params.id)&&perfil!=="Administrador") return res.status(400).json({erro:"O administrador não pode remover o próprio acesso administrativo"});
  const row=(await db.query("UPDATE usuarios SET perfil=$1 WHERE id=$2 RETURNING id,nome,usuario,perfil,criado_em",[perfil,req.params.id])).rows[0];
  if(!row)return res.status(404).json({erro:"Usuário não encontrado"});
  res.json(row);
});

module.exports = router;
