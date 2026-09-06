const express = require("express");
const db = require("../db");

const router = express.Router();
const podeEditar=(req,res)=>{if(["Administrador","Pedagógico"].includes(req.usuario?.perfil))return true;res.status(403).json({erro:"Acesso restrito ao Administrador e Pedagógico"});return false;};

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
  if(!podeEditar(req,res))return;
  const { nome, descricao, programa_social, valor_total } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Nome do projeto e obrigatorio" });
  }
  const valor=valor_total===""||valor_total==null?0:Number(valor_total);
  if(!Number.isFinite(valor)||valor<0)return res.status(400).json({erro:"O valor total do projeto não pode ser negativo"});
  const projeto = (await db.query("INSERT INTO projetos (nome, descricao, programa_social, valor_total) VALUES ($1, $2, $3, $4) RETURNING *", [nome.trim(), descricao || "", programa_social || "", valor])).rows[0];
  res.status(201).json(projeto); } catch (e) { next(e); }
});

// Atualizar projeto
router.put("/:id", async (req, res, next) => { try {
  if(!podeEditar(req,res))return;
  const { nome, descricao, programa_social, valor_total } = req.body;
  const existente = (await db.query("SELECT * FROM projetos WHERE id = $1", [req.params.id])).rows[0];
  if (!existente) return res.status(404).json({ erro: "Projeto não encontrado" });

  const valor=valor_total===undefined?Number(existente.valor_total||0):Number(valor_total);
  if(!Number.isFinite(valor)||valor<0)return res.status(400).json({erro:"O valor total do projeto não pode ser negativo"});
  const atualizado = (await db.query("UPDATE projetos SET nome=$1, descricao=$2, programa_social=$3, valor_total=$4 WHERE id=$5 RETURNING *", [nome ?? existente.nome, descricao ?? existente.descricao, programa_social ?? existente.programa_social, valor, req.params.id])).rows[0];
  res.json(atualizado); } catch (e) { next(e); }
});

// Excluir projeto (e tudo que estiver vinculado, via ON DELETE CASCADE)
router.delete("/:id", async (req, res, next) => { try {
  if(!podeEditar(req,res))return;
  const existente = (await db.query("SELECT id FROM projetos WHERE id = $1", [req.params.id])).rows[0];
  if (!existente) return res.status(404).json({ erro: "Projeto não encontrado" });
  const vinculos=Number((await db.query("SELECT COUNT(*) total FROM financeiro WHERE projeto_id=$1",[req.params.id])).rows[0].total);
  if(vinculos)return res.status(409).json({erro:"Este projeto possui lançamentos financeiros e não pode ser excluído"});
  await db.query("DELETE FROM projetos WHERE id = $1", [req.params.id]);
  res.json({ ok: true }); } catch (e) { next(e); }
});

module.exports = router;
