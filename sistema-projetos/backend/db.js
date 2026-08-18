const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "sistema.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projetos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS instrutores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cursos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  carga_horaria TEXT,
  instrutor TEXT,
  instrutor_id INTEGER REFERENCES instrutores(id) ON DELETE SET NULL,
  local TEXT,
  municipio TEXT,
  horario TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alunos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nis TEXT,
  cpf TEXT,
  data_nascimento TEXT,
  telefone TEXT,
  endereco TEXT,
  escolaridade TEXT,
  renda_familiar TEXT,
  cor_raca TEXT,
  genero TEXT,
  comunidade_tradicional TEXT,
  pcd TEXT,
  lgbt TEXT,
  observacoes TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('aluno','ouvinte')) DEFAULT 'aluno',
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS listas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  data TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financeiro (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  origem_projeto_id INTEGER REFERENCES projetos(id) ON DELETE SET NULL,
  nf_arquivo TEXT,
  nf_nome_original TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// ---------- Migracoes simples (para bancos criados por uma versao anterior) ----------
function colunaExiste(tabela, coluna) {
  return db
    .prepare(`PRAGMA table_info(${tabela})`)
    .all()
    .some((c) => c.name === coluna);
}

if (!colunaExiste("alunos", "nis")) {
  db.exec("ALTER TABLE alunos ADD COLUMN nis TEXT");
}
if (!colunaExiste("alunos", "cpf")) {
  db.exec("ALTER TABLE alunos ADD COLUMN cpf TEXT");
}
if (!colunaExiste("alunos", "data_nascimento")) {
  db.exec("ALTER TABLE alunos ADD COLUMN data_nascimento TEXT");
}
if (!colunaExiste("alunos", "telefone")) {
  db.exec("ALTER TABLE alunos ADD COLUMN telefone TEXT");
}
const novasColunasAluno = [
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
for (const coluna of novasColunasAluno) {
  if (!colunaExiste("alunos", coluna)) {
    db.exec(`ALTER TABLE alunos ADD COLUMN ${coluna} TEXT`);
  }
}
if (!colunaExiste("cursos", "instrutor_id")) {
  db.exec("ALTER TABLE cursos ADD COLUMN instrutor_id INTEGER REFERENCES instrutores(id)");
}

// ---------- Usuario padrao ----------
// Na primeira execucao, cria um usuario admin para o primeiro acesso.
// IMPORTANTE: troque essa senha assim que possivel (tela de login nao tem
// troca de senha ainda - pode ser feito direto no banco ou pedindo um novo
// usuario a quem for dar manutencao no sistema).
const totalUsuarios = db.prepare("SELECT COUNT(*) AS total FROM usuarios").get().total;
if (totalUsuarios === 0) {
  const senhaPadrao = "idep2026";
  const hash = bcrypt.hashSync(senhaPadrao, 10);
  db.prepare("INSERT INTO usuarios (nome, usuario, senha_hash) VALUES (?, ?, ?)").run(
    "Administrador",
    "admin",
    hash
  );
  console.log("Usuario padrao criado -> usuario: admin | senha: idep2026 (troque assim que possivel)");
}

module.exports = db;
