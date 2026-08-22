const express = require("express");
const db = require("../db");

const router = express.Router();

// Listar todos os projetos
router.get("/", async (req, res, next) => {
  try { res.json((await db.query("SELECT * FROM projetos ORDER BY criado_em DESC")).rows); } catch (e) { next(e); }
});

// Buscar um projeto por id
router.get("/:id", async (req, res, next) => { try {
  const projeto = (await db.query("SELECT * FROM projetos WHERE id = $1", [req.params.id])).rows[0];
  if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado" });
  res.json(projeto); } catch (e) { next(e); }
});

// Criar projeto
router.post("/", async (req, res, next) => { try {
  const { nome, descricao, programa_social } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Nome do projeto e obrigatorio" });
  }
  const projeto = (await db.query("INSERT INTO projetos (nome, descricao, programa_social) VALUES ($1, $2, $3) RETURNING *", [nome.trim(), descricao || "", programa_social || ""])).rows[0];
  res.status(201).json(projeto); } catch (e) { next(e); }
});

// Atualizar projeto
router.put("/:id", async (req, res, next) => { try {
  const { nome, descricao, programa_social } = req.body;
  const existente = (await db.query("SELECT * FROM projetos WHERE id = $1", [req.params.id])).rows[0];
  if (!existente) return res.status(404).json({ erro: "Projeto não encontrado" });

  const atualizado = (await db.query("UPDATE projetos SET nome=$1, descricao=$2, programa_social=$3 WHERE id=$4 RETURNING *", [nome ?? existente.nome, descricao ?? existente.descricao, programa_social ?? existente.programa_social, req.params.id])).rows[0];
  res.json(atualizado); } catch (e) { next(e); }
});

// Excluir projeto (e tudo que estiver vinculado, via ON DELETE CASCADE)
router.delete("/:id", async (req, res, next) => { try {
  const existente = (await db.query("SELECT id FROM projetos WHERE id = $1", [req.params.id])).rows[0];
  if (!existente) return res.status(404).json({ erro: "Projeto não encontrado" });
  await db.query("DELETE FROM projetos WHERE id = $1", [req.params.id]);
  res.json({ ok: true }); } catch (e) { next(e); }
});

module.exports = router;
