const { Pool, types } = require("pg");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
types.setTypeParser(20, (value) => Number(value));

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL nao configurada.");
const render = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);
const ssl = process.env.DATABASE_SSL === "false" ? false :
  (process.env.DATABASE_SSL === "true" || render ? { rejectUnauthorized: false } : undefined);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });
pool.on("error", (e) => console.error("Falha em conexao PostgreSQL ociosa:", e.message));

const query = (sql, params = []) => pool.query(sql, params);
function postgresSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}
function prepare(sql) {
  const converted = postgresSql(sql);
  return {
    all: async (...params) => (await query(converted, params)).rows,
    get: async (...params) => (await query(converted, params)).rows[0],
    run: async (...params) => {
      const result = await query(`${converted} RETURNING id`, params);
      return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
    },
  };
}
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally { client.release(); }
}

async function initializeDatabase() {
  await query(`
CREATE TABLE IF NOT EXISTS usuarios (id BIGSERIAL PRIMARY KEY, nome TEXT NOT NULL, usuario TEXT NOT NULL UNIQUE, senha_hash TEXT NOT NULL, criado_em TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text));
CREATE TABLE IF NOT EXISTS projetos (id BIGSERIAL PRIMARY KEY, nome TEXT NOT NULL, descricao TEXT, programa_social TEXT, criado_em TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text));
CREATE TABLE IF NOT EXISTS instrutores (id BIGSERIAL PRIMARY KEY, nome TEXT NOT NULL, criado_em TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text));
CREATE TABLE IF NOT EXISTS cursos (id BIGSERIAL PRIMARY KEY, projeto_id BIGINT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, nome TEXT NOT NULL, carga_horaria TEXT, instrutor TEXT, instrutor_id BIGINT REFERENCES instrutores(id) ON DELETE SET NULL, local TEXT, municipio TEXT, horario TEXT, programa_social TEXT, criado_em TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text));
CREATE TABLE IF NOT EXISTS alunos (id BIGSERIAL PRIMARY KEY, curso_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE, nome TEXT NOT NULL, nis TEXT, cpf TEXT, data_nascimento TEXT, telefone TEXT, endereco TEXT, escolaridade TEXT, renda_familiar TEXT, cor_raca TEXT, genero TEXT, comunidade_tradicional TEXT, pcd TEXT, lgbt TEXT, observacoes TEXT, tipo TEXT NOT NULL DEFAULT 'aluno' CHECK (tipo IN ('aluno','ouvinte')), criado_em TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text));
CREATE TABLE IF NOT EXISTS listas (id BIGSERIAL PRIMARY KEY, curso_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE, titulo TEXT NOT NULL, data TEXT NOT NULL, criado_em TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text));
CREATE TABLE IF NOT EXISTS financeiro (id BIGSERIAL PRIMARY KEY, projeto_id BIGINT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, origem_projeto_id BIGINT REFERENCES projetos(id) ON DELETE SET NULL, nf_arquivo TEXT, nf_nome_original TEXT, categoria TEXT NOT NULL DEFAULT 'Outros', numero_nf TEXT, criado_em TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text));
CREATE TABLE IF NOT EXISTS configuracao_institucional (id INTEGER PRIMARY KEY CHECK (id = 1), nome_instituto TEXT NOT NULL DEFAULT 'Instituto de Desenvolvimento Profissional', cnpj TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS solicitacoes_financeiras (id BIGSERIAL PRIMARY KEY, projeto_id BIGINT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, curso_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE, nome_instituto TEXT NOT NULL, cnpj TEXT, data_solicitacao TEXT NOT NULL, favorecido TEXT NOT NULL, chave_pix TEXT NOT NULL, total DOUBLE PRECISION NOT NULL DEFAULT 0, criado_em TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text));
CREATE TABLE IF NOT EXISTS solicitacao_financeira_itens (id BIGSERIAL PRIMARY KEY, solicitacao_id BIGINT NOT NULL REFERENCES solicitacoes_financeiras(id) ON DELETE CASCADE, tipo TEXT NOT NULL, descricao_outro TEXT, valor_unitario DOUBLE PRECISION NOT NULL, dias DOUBLE PRECISION NOT NULL, numero_alunos DOUBLE PRECISION, total DOUBLE PRECISION NOT NULL);
CREATE INDEX IF NOT EXISTS idx_cursos_projeto_id ON cursos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_alunos_curso_id ON alunos(curso_id);
CREATE INDEX IF NOT EXISTS idx_listas_curso_id ON listas(curso_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_projeto_id ON financeiro(projeto_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_projeto_id ON solicitacoes_financeiras(projeto_id);
CREATE INDEX IF NOT EXISTS idx_solicitacao_itens_solicitacao_id ON solicitacao_financeira_itens(solicitacao_id);
INSERT INTO configuracao_institucional (id, nome_instituto, cnpj) VALUES (1, 'Instituto de Desenvolvimento Profissional', '') ON CONFLICT (id) DO NOTHING;
  `);
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (nome TEXT PRIMARY KEY, aplicado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  const migrationsDir = path.join(__dirname, "migrations");
  for (const nome of fs.readdirSync(migrationsDir).filter((n) => n.endsWith(".sql")).sort()) {
    const applied = await query("SELECT 1 FROM schema_migrations WHERE nome=$1", [nome]);
    if (applied.rowCount) continue;
    await transaction(async (client) => {
      await client.query(fs.readFileSync(path.join(migrationsDir, nome), "utf8"));
      await client.query("INSERT INTO schema_migrations (nome) VALUES ($1)", [nome]);
    });
    console.log(`Migration aplicada: ${nome}`);
  }
  const count = Number((await query("SELECT COUNT(*) AS total FROM usuarios")).rows[0].total);
  if (count === 0 && process.env.ADMIN_INITIAL_PASSWORD) {
    const nome = process.env.ADMIN_INITIAL_NAME || "Administrador";
    const usuario = process.env.ADMIN_INITIAL_USER || "admin";
    const hash = await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD, 10);
    await query("INSERT INTO usuarios (nome, usuario, senha_hash) VALUES ($1,$2,$3) ON CONFLICT (usuario) DO NOTHING", [nome, usuario, hash]);
    console.log("Usuario administrador inicial criado a partir das variaveis de ambiente.");
  }
}
module.exports = { pool, query, prepare, transaction, initializeDatabase };
