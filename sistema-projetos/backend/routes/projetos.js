const express = require("express");
const db = require("../db");

const router = express.Router();

// Listar todos os projetos
router.get("/", (req, res) => {
  const projetos = db.prepare("SELECT * FROM projetos ORDER BY criado_em DESC").all();
  res.json(projetos);
});

// Buscar um projeto por id
router.get("/:id", (req, res) => {
  const projeto = db.prepare("SELECT * FROM projetos WHERE id = ?").get(req.params.id);
  if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado" });
  res.json(projeto);
});

// Criar projeto
router.post("/", (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Nome do projeto e obrigatorio" });
  }
  const stmt = db.prepare("INSERT INTO projetos (nome, descricao) VALUES (?, ?)");
  const info = stmt.run(nome.trim(), descricao || "");
  const projeto = db.prepare("SELECT * FROM projetos WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(projeto);
});

// Atualizar projeto
router.put("/:id", (req, res) => {
  const { nome, descricao } = req.body;
  const existente = db.prepare("SELECT * FROM projetos WHERE id = ?").get(req.params.id);
  if (!existente) return res.status(404).json({ erro: "Projeto não encontrado" });

  db.prepare("UPDATE projetos SET nome = ?, descricao = ? WHERE id = ?").run(
    nome ?? existente.nome,
    descricao ?? existente.descricao,
    req.params.id
  );
  const atualizado = db.prepare("SELECT * FROM projetos WHERE id = ?").get(req.params.id);
  res.json(atualizado);
});

// Excluir projeto (e tudo que estiver vinculado, via ON DELETE CASCADE)
router.delete("/:id", (req, res) => {
  const existente = db.prepare("SELECT * FROM projetos WHERE id = ?").get(req.params.id);
  if (!existente) return res.status(404).json({ erro: "Projeto não encontrado" });
  db.prepare("DELETE FROM projetos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
