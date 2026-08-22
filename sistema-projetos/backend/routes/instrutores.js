const express = require("express");
const db = require("../db");

const router = express.Router();

// Listar instrutores
router.get("/instrutores", async (req, res, next) => { try {
  res.json((await db.query("SELECT * FROM instrutores ORDER BY nome ASC")).rows); } catch(e) { next(e); }
});

// Criar instrutor
router.post("/instrutores", async (req, res, next) => { try {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Nome do instrutor e obrigatorio" });
  }
  const instrutor = (await db.query("INSERT INTO instrutores (nome) VALUES ($1) RETURNING *", [nome.trim()])).rows[0];
  res.status(201).json(instrutor); } catch(e) { next(e); }
});

// Excluir instrutor
router.delete("/instrutores/:id", async (req, res, next) => { try {
  const existente = (await db.query("SELECT id FROM instrutores WHERE id = $1", [req.params.id])).rows[0];
  if (!existente) return res.status(404).json({ erro: "Instrutor não encontrado" });
  // cursos que apontam pra esse instrutor ficam com instrutor_id nulo (ON DELETE SET NULL)
  await db.query("DELETE FROM instrutores WHERE id = $1", [req.params.id]);
  res.json({ ok: true }); } catch(e) { next(e); }
});

module.exports = router;
