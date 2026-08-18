const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

// Listar lancamentos financeiros de um projeto
router.get("/projetos/:projetoId/financeiro", (req, res) => {
  const registros = db
    .prepare(
      `SELECT f.*, p.nome AS origem_nome
       FROM financeiro f
       LEFT JOIN projetos p ON p.id = f.origem_projeto_id
       WHERE f.projeto_id = ?
       ORDER BY f.criado_em DESC`
    )
    .all(req.params.projetoId);
  res.json(registros);
});

// Criar lancamento financeiro (com upload opcional de NF)
router.post("/projetos/:projetoId/financeiro", upload.single("nf"), (req, res) => {
  const projeto = db.prepare("SELECT id FROM projetos WHERE id = ?").get(req.params.projetoId);
  if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado" });

  const { origem_projeto_id } = req.body;
  const arquivo = req.file ? req.file.filename : null;
  const nomeOriginal = req.file ? req.file.originalname : null;

  const stmt = db.prepare(`
    INSERT INTO financeiro (projeto_id, origem_projeto_id, nf_arquivo, nf_nome_original)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(
    req.params.projetoId,
    origem_projeto_id || null,
    arquivo,
    nomeOriginal
  );
  const registro = db
    .prepare(
      `SELECT f.*, p.nome AS origem_nome
       FROM financeiro f
       LEFT JOIN projetos p ON p.id = f.origem_projeto_id
       WHERE f.id = ?`
    )
    .get(info.lastInsertRowid);
  res.status(201).json(registro);
});

// Baixar o arquivo de NF de um lancamento
router.get("/financeiro/:id/nf", (req, res) => {
  const registro = db.prepare("SELECT * FROM financeiro WHERE id = ?").get(req.params.id);
  if (!registro || !registro.nf_arquivo) {
    return res.status(404).json({ erro: "Nenhum arquivo de NF encontrado" });
  }
  const filePath = path.join(uploadsDir, registro.nf_arquivo);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ erro: "Arquivo não encontrado no servidor" });
  }
  res.download(filePath, registro.nf_nome_original || registro.nf_arquivo);
});

// Excluir lancamento financeiro
router.delete("/financeiro/:id", (req, res) => {
  const registro = db.prepare("SELECT * FROM financeiro WHERE id = ?").get(req.params.id);
  if (!registro) return res.status(404).json({ erro: "Registro não encontrado" });
  if (registro.nf_arquivo) {
    const filePath = path.join(uploadsDir, registro.nf_arquivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare("DELETE FROM financeiro WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
