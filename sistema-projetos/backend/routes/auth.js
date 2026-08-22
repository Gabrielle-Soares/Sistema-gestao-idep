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
  res.json({ token, usuario: { id: registro.id, nome: registro.nome, usuario: registro.usuario } }); } catch(e) { next(e); }
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

module.exports = router;
