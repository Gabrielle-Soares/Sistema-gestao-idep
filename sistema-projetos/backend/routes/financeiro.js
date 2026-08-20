const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const db = require("../db");

const router = express.Router();
const LOGO_PATH = path.join(__dirname, "..", "assets", "logo-idep.png");
const TEM_LOGO = fs.existsSync(LOGO_PATH);
const TIPOS_DESPESA = new Set(["Lanche", "Pagamento de instrutor", "Hospedagem", "Diária", "Material específico", "Passagem", "Outro"]);

const moeda = (valor) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBrasileira = (data) => {
  const [ano, mes, dia] = String(data || "").split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data || "-";
};

function cabecalhoTabela(doc, y, x, largura) {
  const colunas = [["Despesa", 160], ["Vlr. unit.", 78], ["Dias", 45], ["Alunos", 52], ["Total", 92]];
  doc.rect(x, y, largura, 21).fill("#101b33");
  let cursor = x;
  doc.fillColor("#fff").font("Helvetica-Bold").fontSize(8);
  colunas.forEach(([titulo, tamanho]) => {
    doc.text(titulo, cursor + 5, y + 7, { width: tamanho - 8, align: titulo === "Despesa" ? "left" : "right" });
    cursor += tamanho;
  });
  return y + 21;
}

function cabecalhoPdf(doc, solicitacao) {
  const x = 42;
  const y = 38;
  const largura = 511;
  if (TEM_LOGO) doc.image(LOGO_PATH, x, y, { fit: [58, 58] });
  const textoX = TEM_LOGO ? x + 70 : x;
  doc.fillColor("#101b33").font("Helvetica-Bold").fontSize(13).text(solicitacao.nome_instituto, textoX, y + 4, { width: 310 });
  doc.font("Helvetica").fontSize(9).fillColor("#5b6478").text(solicitacao.cnpj ? `CNPJ: ${solicitacao.cnpj}` : "CNPJ não informado", textoX, y + 23, { width: 310 });
  doc.fillColor("#101b33").font("Helvetica-Bold").fontSize(10).text("SOLICITAÇÃO FINANCEIRA", x, y + 77, { width: largura, align: "center" });
  doc.moveTo(x, y + 96).lineTo(x + largura, y + 96).strokeColor("#e23744").lineWidth(1.3).stroke();
  return y + 112;
}

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

router.get("/configuracao-institucional", (req, res) => {
  res.json(db.prepare("SELECT nome_instituto, cnpj FROM configuracao_institucional WHERE id = 1").get());
});

router.put("/configuracao-institucional", (req, res) => {
  const nome = String(req.body.nome_instituto || "").trim();
  if (!nome) return res.status(400).json({ erro: "Informe o nome do instituto" });
  db.prepare("UPDATE configuracao_institucional SET nome_instituto = ?, cnpj = ? WHERE id = 1").run(nome, String(req.body.cnpj || "").trim());
  res.json(db.prepare("SELECT nome_instituto, cnpj FROM configuracao_institucional WHERE id = 1").get());
});

router.get("/projetos/:projetoId/solicitacoes-financeiras", (req, res) => {
  const cursoId = req.query.curso_id;
  const solicitacoes = db.prepare(`SELECT s.*, c.nome AS curso_nome, c.municipio AS curso_municipio FROM solicitacoes_financeiras s JOIN cursos c ON c.id = s.curso_id WHERE s.projeto_id = ? ${cursoId ? "AND s.curso_id = ?" : ""} ORDER BY s.criado_em DESC`).all(...(cursoId ? [req.params.projetoId, cursoId] : [req.params.projetoId]));
  res.json(solicitacoes);
});

router.post("/projetos/:projetoId/solicitacoes-financeiras", (req, res) => {
  const { curso_id, data_solicitacao, favorecido, chave_pix, itens } = req.body;
  const curso = db.prepare("SELECT id FROM cursos WHERE id = ? AND projeto_id = ?").get(curso_id, req.params.projetoId);
  if (!curso) return res.status(400).json({ erro: "Selecione um curso deste projeto" });
  if (!data_solicitacao || !favorecido?.trim() || !chave_pix?.trim() || !Array.isArray(itens) || !itens.length) return res.status(400).json({ erro: "Preencha os dados e inclua ao menos um item" });
  const normalizados = [];
  for (const item of itens) {
    const tipo = String(item.tipo || ""), valor = Number(item.valor_unitario), dias = Number(item.dias);
    const alunos = item.numero_alunos === "" || item.numero_alunos == null ? null : Number(item.numero_alunos);
    const descricao = String(item.descricao_outro || "").trim();
    if (!TIPOS_DESPESA.has(tipo) || !Number.isFinite(valor) || valor < 0 || !Number.isFinite(dias) || dias <= 0 || (alunos !== null && (!Number.isFinite(alunos) || alunos <= 0)) || (tipo === "Outro" && !descricao)) return res.status(400).json({ erro: "Revise os itens de despesa" });
    normalizados.push({ tipo, descricao, valor, dias, alunos, total: valor * dias * (alunos ?? 1) });
  }
  const config = db.prepare("SELECT nome_instituto, cnpj FROM configuracao_institucional WHERE id = 1").get();
  const total = normalizados.reduce((soma, item) => soma + item.total, 0);
  const salvar = db.transaction(() => {
    const info = db.prepare("INSERT INTO solicitacoes_financeiras (projeto_id, curso_id, nome_instituto, cnpj, data_solicitacao, favorecido, chave_pix, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(req.params.projetoId, curso.id, config.nome_instituto, config.cnpj, data_solicitacao, favorecido.trim(), chave_pix.trim(), total);
    const inserir = db.prepare("INSERT INTO solicitacao_financeira_itens (solicitacao_id, tipo, descricao_outro, valor_unitario, dias, numero_alunos, total) VALUES (?, ?, ?, ?, ?, ?, ?)");
    normalizados.forEach((i) => inserir.run(info.lastInsertRowid, i.tipo, i.descricao || null, i.valor, i.dias, i.alunos, i.total));
    return info.lastInsertRowid;
  });
  const id = salvar();
  res.status(201).json(db.prepare("SELECT * FROM solicitacoes_financeiras WHERE id = ?").get(id));
});

router.delete("/solicitacoes-financeiras/:id", (req, res) => {
  const resultado = db.prepare("DELETE FROM solicitacoes_financeiras WHERE id = ?").run(req.params.id);
  if (!resultado.changes) return res.status(404).json({ erro: "Solicitação não encontrada" });
  res.json({ ok: true });
});

router.get("/solicitacoes-financeiras/:id/pdf", (req, res) => {
  const s = db.prepare("SELECT s.*, c.nome AS curso_nome, c.municipio AS curso_municipio FROM solicitacoes_financeiras s JOIN cursos c ON c.id = s.curso_id WHERE s.id = ?").get(req.params.id);
  if (!s) return res.status(404).json({ erro: "Solicitação não encontrada" });
  const itens = db.prepare("SELECT * FROM solicitacao_financeira_itens WHERE solicitacao_id = ? ORDER BY id").all(s.id);
  res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `attachment; filename="solicitacao-financeira-${s.id}.pdf"`);
  const doc = new PDFDocument({ margin: 42, size: "A4" }); doc.pipe(res);
  const x = 42, largura = 511; let y = cabecalhoPdf(doc, s);
  doc.font("Helvetica").fontSize(10).fillColor("#101b33").text(`Curso: ${s.curso_nome}`, x, y).text(`Município: ${s.curso_municipio || "-"}`, x, y + 17).text(`Data da solicitação: ${dataBrasileira(s.data_solicitacao)}`, x + 260, y, { width: 251, align: "right" });
  y = cabecalhoTabela(doc, y + 48, x, largura);
  itens.forEach((item, indice) => {
    if (y > 737) { doc.addPage(); y = cabecalhoTabela(doc, cabecalhoPdf(doc, s), x, largura); }
    doc.rect(x, y, largura, 28).fill(indice % 2 ? "#fff" : "#f6f4ef"); doc.fillColor("#101b33").font("Helvetica").fontSize(8.5);
    doc.text(item.tipo === "Outro" ? `Outro: ${item.descricao_outro}` : item.tipo, x + 5, y + 9, { width: 152 }); doc.text(moeda(item.valor_unitario), x + 165, y + 9, { width: 68, align: "right" }); doc.text(String(item.dias), x + 243, y + 9, { width: 35, align: "right" }); doc.text(item.numero_alunos == null ? "-" : String(item.numero_alunos), x + 288, y + 9, { width: 42, align: "right" }); doc.font("Helvetica-Bold").text(moeda(item.total), x + 340, y + 9, { width: 82, align: "right" }); y += 28;
  });
  y += 12; doc.rect(x + 286, y, 225, 32).fill("#101b33"); doc.fillColor("#fff").font("Helvetica-Bold").fontSize(10).text(`TOTAL GERAL: ${moeda(s.total)}`, x + 297, y + 10, { width: 202, align: "right" });
  y += 64; doc.fillColor("#101b33").font("Helvetica-Bold").fontSize(10).text("Dados para pagamento", x, y); doc.font("Helvetica").text(`Favorecido: ${s.favorecido}`, x, y + 19).text(`Chave PIX: ${s.chave_pix}`, x, y + 37); doc.end();
});

module.exports = router;
