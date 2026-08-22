const path = require("path");
const fs = require("fs");
const express = require("express");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const db = require("../db");

const router = express.Router();

const LOGO_PATH = path.join(__dirname, "..", "assets", "logo-idep.png");
const TEM_LOGO = fs.existsSync(LOGO_PATH);

// ---------- Cursos ----------

// Listar cursos de um projeto (com nome do instrutor via JOIN)
router.get("/projetos/:projetoId/cursos", async (req, res) => {
  const cursos = await db.prepare(
      `SELECT c.*, i.nome AS instrutor_nome
       FROM cursos c
       LEFT JOIN instrutores i ON i.id = c.instrutor_id
       WHERE c.projeto_id = ?
       ORDER BY c.criado_em DESC`
    )
    .all(req.params.projetoId);
  res.json(cursos);
});

// Criar curso em um projeto
router.post("/projetos/:projetoId/cursos", async (req, res) => {
  const { nome, carga_horaria, instrutor_id, local, municipio, horario, programa_social } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Nome do curso e obrigatorio" });
  }
  const projeto = await db.prepare("SELECT id FROM projetos WHERE id = ?").get(req.params.projetoId);
  if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado" });

  const stmt = await db.prepare(`
    INSERT INTO cursos (projeto_id, nome, carga_horaria, instrutor_id, local, municipio, horario, programa_social)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = await stmt.run(
    req.params.projetoId,
    nome.trim(),
    carga_horaria || "",
    instrutor_id || null,
    local || "",
    municipio || "",
    horario || "",
    programa_social || ""
  );
  const curso = await db.prepare(
      `SELECT c.*, i.nome AS instrutor_nome
       FROM cursos c LEFT JOIN instrutores i ON i.id = c.instrutor_id
       WHERE c.id = ?`
    )
    .get(info.lastInsertRowid);
  res.status(201).json(curso);
});

// Atualizar curso
router.put("/cursos/:cursoId", async (req, res) => {
  const existente = await db.prepare("SELECT * FROM cursos WHERE id = ?").get(req.params.cursoId);
  if (!existente) return res.status(404).json({ erro: "Curso não encontrado" });
  const { nome, carga_horaria, instrutor_id, local, municipio, horario, programa_social } = req.body;
  await db.prepare(`
    UPDATE cursos SET nome = ?, carga_horaria = ?, instrutor_id = ?, local = ?, municipio = ?, horario = ?, programa_social = ?
    WHERE id = ?
  `).run(
    nome ?? existente.nome,
    carga_horaria ?? existente.carga_horaria,
    instrutor_id !== undefined ? instrutor_id || null : existente.instrutor_id,
    local ?? existente.local,
    municipio ?? existente.municipio,
    horario ?? existente.horario,
    programa_social ?? existente.programa_social,
    req.params.cursoId
  );
  const atualizado = await db.prepare(
      `SELECT c.*, i.nome AS instrutor_nome
       FROM cursos c LEFT JOIN instrutores i ON i.id = c.instrutor_id
       WHERE c.id = ?`
    )
    .get(req.params.cursoId);
  res.json(atualizado);
});

// Excluir curso
router.delete("/cursos/:cursoId", async (req, res) => {
  const existente = await db.prepare("SELECT * FROM cursos WHERE id = ?").get(req.params.cursoId);
  if (!existente) return res.status(404).json({ erro: "Curso não encontrado" });
  await db.prepare("DELETE FROM cursos WHERE id = ?").run(req.params.cursoId);
  res.json({ ok: true });
});

// ---------- Alunos / Ouvintes ----------

// Listar alunos de um curso
router.get("/cursos/:cursoId/alunos", async (req, res) => {
  const alunos = await db.prepare("SELECT * FROM alunos WHERE curso_id = ? ORDER BY nome ASC")
    .all(req.params.cursoId);
  res.json(alunos);
});

const CAMPOS_ALUNO = [
  "nome",
  "nis",
  "cpf",
  "chave_pix",
  "data_nascimento",
  "telefone",
  "endereco",
  "escolaridade",
  "renda_familiar",
  "cor_raca",
  "genero",
  "comunidade_tradicional",
  "pcd",
  "lgbt",
  "observacoes",
];

// Adicionar aluno/ouvinte a um curso
router.post("/cursos/:cursoId/alunos", async (req, res) => {
  const { nome, tipo } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Nome e obrigatorio" });
  }
  const curso = await db.prepare("SELECT id FROM cursos WHERE id = ?").get(req.params.cursoId);
  if (!curso) return res.status(404).json({ erro: "Curso não encontrado" });

  const tipoFinal = tipo === "ouvinte" ? "ouvinte" : "aluno";
  const colunas = CAMPOS_ALUNO.join(", ");
  const placeholders = CAMPOS_ALUNO.map(() => "?").join(", ");
  const valores = CAMPOS_ALUNO.map((campo) => (req.body[campo] || "").toString().trim());

  const stmt = await db.prepare(
    `INSERT INTO alunos (curso_id, ${colunas}, tipo) VALUES (?, ${placeholders}, ?)`
  );
  const info = await stmt.run(req.params.cursoId, ...valores, tipoFinal);
  const aluno = await db.prepare("SELECT * FROM alunos WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(aluno);
});

// Atualizar aluno/ouvinte
router.put("/alunos/:alunoId", async (req, res) => {
  const existente = await db.prepare("SELECT * FROM alunos WHERE id = ?").get(req.params.alunoId);
  if (!existente) return res.status(404).json({ erro: "Registro não encontrado" });

  const tipoFinal = req.body.tipo === "ouvinte" ? "ouvinte" : req.body.tipo === "aluno" ? "aluno" : existente.tipo;
  const sets = CAMPOS_ALUNO.map((c) => `${c} = ?`).join(", ");
  const valores = CAMPOS_ALUNO.map((campo) =>
    req.body[campo] !== undefined ? (req.body[campo] || "").toString().trim() : existente[campo]
  );

  await db.prepare(`UPDATE alunos SET ${sets}, tipo = ? WHERE id = ?`).run(
    ...valores,
    tipoFinal,
    req.params.alunoId
  );
  const atualizado = await db.prepare("SELECT * FROM alunos WHERE id = ?").get(req.params.alunoId);
  res.json(atualizado);
});

// Remover aluno/ouvinte
router.delete("/alunos/:alunoId", async (req, res) => {
  const existente = await db.prepare("SELECT * FROM alunos WHERE id = ?").get(req.params.alunoId);
  if (!existente) return res.status(404).json({ erro: "Registro não encontrado" });
  await db.prepare("DELETE FROM alunos WHERE id = ?").run(req.params.alunoId);
  res.json({ ok: true });
});

// ---------- Listas (geracao de PDF com espaco para assinatura) ----------

// Gerar lista em PDF para um curso
router.get("/cursos/:cursoId/lista/pdf", async (req, res) => {
  const curso = await db.prepare(
      `SELECT c.*, i.nome AS instrutor_nome
       FROM cursos c LEFT JOIN instrutores i ON i.id = c.instrutor_id
       WHERE c.id = ?`
    )
    .get(req.params.cursoId);
  if (!curso) return res.status(404).json({ erro: "Curso não encontrado" });

  const titulo = req.query.titulo || `Lista - ${curso.nome}`;
  const data = req.query.data || new Date().toLocaleDateString("pt-BR");

  const alunos = await db.prepare("SELECT * FROM alunos WHERE curso_id = ? ORDER BY tipo ASC, nome ASC")
    .all(req.params.cursoId);

  // registra a geracao da lista no historico
  await db.prepare("INSERT INTO listas (curso_id, titulo, data) VALUES (?, ?, ?)").run(
    req.params.cursoId,
    titulo,
    data
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="lista-${curso.nome.replace(/\s+/g, "_")}.pdf"`
  );

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  // Cabecalho com logo
  const startX = 40;
  const headerTop = 40;
  const logoSize = 50;

  if (TEM_LOGO) {
    doc.image(LOGO_PATH, startX, headerTop, { width: logoSize, height: logoSize });
  }

  const textoX = TEM_LOGO ? startX + logoSize + 14 : startX;
  const textoWidth = 515 - (TEM_LOGO ? logoSize + 14 : 0);

  doc
    .fontSize(9)
    .fillColor("#888")
    .text("Instituto de Desenvolvimento Profissional", textoX, headerTop, { width: textoWidth });
  doc
    .fontSize(15)
    .fillColor("#000")
    .font("Helvetica-Bold")
    .text(titulo, textoX, headerTop + 13, { width: textoWidth });
  doc.font("Helvetica").fontSize(9).fillColor("#555").text(`Data: ${data}`, textoX, headerTop + 34, {
    width: textoWidth,
  });

  doc.y = headerTop + logoSize + 10;
  doc
    .moveTo(startX, doc.y)
    .lineTo(555, doc.y)
    .strokeColor("#999")
    .stroke();
  doc.moveDown(1);

  doc.fillColor("#000").fontSize(10);
  doc.text(
    `Curso: ${curso.nome}   |   Instrutor: ${curso.instrutor_nome || "-"}   |   Carga horária: ${
      curso.carga_horaria || "-"
    }`,
    startX
  );
  doc.text(
    `Local: ${curso.local || "-"}   |   Município: ${curso.municipio || "-"}   |   Horário: ${
      curso.horario || "-"
    }`,
    startX
  );
  doc.moveDown(1);

  // Cabecalho da tabela
  let y = doc.y;
  const colNome = 165;
  const colNis = 90;
  const colTipo = 60;
  const colAssinatura = 145;

  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Nome", startX, y);
  doc.text("NIS", startX + colNome, y);
  doc.text("Tipo", startX + colNome + colNis, y);
  doc.text("Assinatura", startX + colNome + colNis + colTipo, y);
  doc.font("Helvetica");
  y += 16;
  doc
    .moveTo(startX, y)
    .lineTo(startX + colNome + colNis + colTipo + colAssinatura, y)
    .strokeColor("#999")
    .stroke();
  y += 8;

  if (alunos.length === 0) {
    doc.text("Nenhum aluno/ouvinte cadastrado neste curso.", startX, y);
  }

  alunos.forEach((a) => {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    doc.text(a.nome, startX, y, { width: colNome - 10 });
    doc.text(a.nis || "-", startX + colNome, y, { width: colNis - 10 });
    doc.text(a.tipo === "ouvinte" ? "Ouvinte" : "Aluno", startX + colNome + colNis, y);
    doc
      .moveTo(startX + colNome + colNis + colTipo, y + 12)
      .lineTo(startX + colNome + colNis + colTipo + colAssinatura - 10, y + 12)
      .strokeColor("#bbb")
      .stroke();
    y += 30;
  });

  doc.end();
});

// Historico de listas geradas para um curso
router.get("/cursos/:cursoId/listas", async (req, res) => {
  const listas = await db.prepare("SELECT * FROM listas WHERE curso_id = ? ORDER BY criado_em DESC")
    .all(req.params.cursoId);
  res.json(listas);
});

// ---------- Exportacao para Excel ----------

router.get("/cursos/:cursoId/alunos/excel", async (req, res) => {
  const curso = await db.prepare(
      `SELECT c.*, i.nome AS instrutor_nome
       FROM cursos c LEFT JOIN instrutores i ON i.id = c.instrutor_id
       WHERE c.id = ?`
    )
    .get(req.params.cursoId);
  if (!curso) return res.status(404).json({ erro: "Curso não encontrado" });

  const alunos = await db.prepare("SELECT * FROM alunos WHERE curso_id = ? ORDER BY tipo ASC, nome ASC")
    .all(req.params.cursoId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Projetos - IDEP Brasil";
  const sheet = workbook.addWorksheet("Alunos");

  sheet.columns = [
    { header: "Nome", key: "nome", width: 28 },
    { header: "Tipo", key: "tipo", width: 10 },
    { header: "NIS", key: "nis", width: 16 },
    { header: "CPF", key: "cpf", width: 16 },
    { header: "Data de nascimento", key: "data_nascimento", width: 16 },
    { header: "Telefone", key: "telefone", width: 16 },
    { header: "Endereço", key: "endereco", width: 30 },
    { header: "Escolaridade", key: "escolaridade", width: 22 },
    { header: "Renda familiar", key: "renda_familiar", width: 20 },
    { header: "Cor/Raca", key: "cor_raca", width: 16 },
    { header: "Genero", key: "genero", width: 16 },
    { header: "Comunidade tradicional", key: "comunidade_tradicional", width: 20 },
    { header: "PCD", key: "pcd", width: 12 },
    { header: "LGBT", key: "lgbt", width: 12 },
    { header: "Observações", key: "observacoes", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  alunos.forEach((a) => {
    sheet.addRow({
      nome: a.nome,
      tipo: a.tipo === "ouvinte" ? "Ouvinte" : "Aluno",
      nis: a.nis || "",
      cpf: a.cpf || "",
      data_nascimento: a.data_nascimento || "",
      telefone: a.telefone || "",
      endereco: a.endereco || "",
      escolaridade: a.escolaridade || "",
      renda_familiar: a.renda_familiar || "",
      cor_raca: a.cor_raca || "",
      genero: a.genero || "",
      comunidade_tradicional: a.comunidade_tradicional || "",
      pcd: a.pcd || "",
      lgbt: a.lgbt || "",
      observacoes: a.observacoes || "",
    });
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="alunos-${curso.nome.replace(/\s+/g, "_")}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
});

module.exports = router;
