const { initializeDatabase, pool } = require("./db");
initializeDatabase()
  .then(() => console.log("Schema PostgreSQL atualizado com sucesso."))
  .catch((e) => { console.error("Falha ao aplicar migrations:", e.message); process.exitCode = 1; })
  .finally(() => pool.end());
