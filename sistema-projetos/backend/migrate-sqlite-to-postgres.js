const path = require("path");
const Database = require("better-sqlite3");
const { pool, initializeDatabase } = require("./db");

const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, "sistema.db");
const tables = [
  ["usuarios", ["id","nome","usuario","senha_hash","criado_em"]],
  ["projetos", ["id","nome","descricao","programa_social","criado_em"]],
  ["instrutores", ["id","nome","criado_em"]],
  ["cursos", ["id","projeto_id","nome","carga_horaria","instrutor","instrutor_id","local","municipio","horario","programa_social","criado_em"]],
  ["alunos", ["id","curso_id","nome","nis","cpf","data_nascimento","telefone","endereco","escolaridade","renda_familiar","cor_raca","genero","comunidade_tradicional","pcd","lgbt","observacoes","tipo","criado_em"]],
  ["listas", ["id","curso_id","titulo","data","criado_em"]],
  ["financeiro", ["id","projeto_id","origem_projeto_id","nf_arquivo","nf_nome_original","categoria","numero_nf","criado_em"]],
  ["configuracao_institucional", ["id","nome_instituto","cnpj"]],
  ["solicitacoes_financeiras", ["id","projeto_id","curso_id","nome_instituto","cnpj","data_solicitacao","favorecido","chave_pix","total","criado_em"]],
  ["solicitacao_financeira_itens", ["id","solicitacao_id","tipo","descricao_outro","valor_unitario","dias","numero_alunos","total"]],
];

async function migrate() {
  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  try {
    await initializeDatabase();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const [table, expected] of tables) {
        const exists = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
        if (!exists) { console.log(`${table}: ausente no SQLite, ignorada`); continue; }
        const available = new Set(sqlite.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
        const columns = expected.filter((c) => available.has(c));
        const rows = sqlite.prepare(`SELECT ${columns.join(",")} FROM ${table}`).all();
        let inserted = 0;
        for (const row of rows) {
          const params = columns.map((_, i) => `$${i + 1}`).join(",");
          const conflict = table === "configuracao_institucional"
            ? "ON CONFLICT (id) DO UPDATE SET nome_instituto=EXCLUDED.nome_instituto, cnpj=EXCLUDED.cnpj WHERE configuracao_institucional.nome_instituto='Instituto de Desenvolvimento Profissional' AND configuracao_institucional.cnpj=''"
            : "ON CONFLICT (id) DO NOTHING";
          const result = await client.query(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${params}) ${conflict}`, columns.map((c) => row[c]));
          inserted += result.rowCount;
        }
        console.log(`${table}: ${inserted} inseridos, ${rows.length - inserted} ja existentes`);
      }
      for (const [table] of tables.filter(([name]) => name !== "configuracao_institucional")) {
        await client.query(`SELECT setval(pg_get_serial_sequence('${table}','id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), (SELECT COUNT(*) > 0 FROM ${table}))`);
      }
      await client.query("COMMIT");
      console.log("Migracao concluida. O arquivo SQLite nao foi alterado.");
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  } finally { sqlite.close(); await pool.end(); }
}

migrate().catch((e) => { console.error("Migracao cancelada e revertida:", e.message); process.exitCode = 1; });
