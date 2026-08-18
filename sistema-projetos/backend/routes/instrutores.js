const express = require("express");
const db = require("../db");

const router = express.Router();

// Listar instrutores
router.get("/instrutores", (req, res) => {
  const instrutores = db.prepare("SELECT * FROM instrutores ORDER BY nome ASC").all();
  res.json(instrutores);
});

// Criar instrutor
router.post("/instrutores", (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Nome do instrutor e obrigatorio" });
  }
  const stmt = db.prepare("INSERT INTO instrutores (nome) VALUES (?)");
  const info = stmt.run(nome.trim());
  const instrutor = db.prepare("SELECT * FROM instrutores WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(instrutor);
});

// Excluir instrutor
router.delete("/instrutores/:id", (req, res) => {
  const existente = db.prepare("SELECT * FROM instrutores WHERE id = ?").get(req.params.id);
  if (!existente) return res.status(404).json({ erro: "Instrutor não encontrado" });
  // cursos que apontam pra esse instrutor ficam com instrutor_id nulo (ON DELETE SET NULL)
  db.prepare("DELETE FROM instrutores WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
