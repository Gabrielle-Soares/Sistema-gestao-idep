const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { gerarToken, autenticacaoObrigatoria } = require("../auth");

const router = express.Router();

// Login
router.post("/login", (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) {
    return res.status(400).json({ erro: "Informe usuario e senha" });
  }

  const registro = db.prepare("SELECT * FROM usuarios WHERE usuario = ?").get(usuario.trim());
  if (!registro) {
    return res.status(401).json({ erro: "Usuario ou senha invalidos" });
  }

  const senhaCorreta = bcrypt.compareSync(senha, registro.senha_hash);
  if (!senhaCorreta) {
    return res.status(401).json({ erro: "Usuario ou senha invalidos" });
  }

  const token = gerarToken(registro);
  res.json({ token, usuario: { id: registro.id, nome: registro.nome, usuario: registro.usuario } });
});

// Verifica se o token atual ainda e valido e devolve os dados do usuario logado
router.get("/me", autenticacaoObrigatoria, (req, res) => {
  res.json({ usuario: req.usuario });
});

// Trocar a propria senha (tela "Minha Conta")
router.put("/senha", autenticacaoObrigatoria, (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ erro: "Informe a senha atual e a nova senha" });
  }
  if (novaSenha.length < 6) {
    return res.status(400).json({ erro: "A nova senha precisa ter pelo menos 6 caracteres" });
  }

  const registro = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(req.usuario.id);
  if (!registro) return res.status(404).json({ erro: "Usuario nao encontrado" });

  const senhaCorreta = bcrypt.compareSync(senhaAtual, registro.senha_hash);
  if (!senhaCorreta) {
    return res.status(401).json({ erro: "Senha atual incorreta" });
  }

  const novoHash = bcrypt.hashSync(novaSenha, 10);
  db.prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?").run(novoHash, req.usuario.id);
  res.json({ ok: true });
});

module.exports = router;
