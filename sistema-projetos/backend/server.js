const express = require("express");
const path = require("path");
require("express-async-errors");
const cors = require("cors");

const { autenticacaoObrigatoria } = require("./auth");
const authRouter = require("./routes/auth");
const projetosRouter = require("./routes/projetos");
const pedagogicoRouter = require("./routes/pedagogico");
const financeiroRouter = require("./routes/financeiro");
const instrutoresRouter = require("./routes/instrutores");
const gestaoFinanceiraRouter = require("./routes/gestaoFinanceira");
const { initializeDatabase } = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/logo-idep.png", (req, res) => res.sendFile(path.join(__dirname, "assets", "logo-idep.png")));

// Rotas publicas (login)
app.use("/api/auth", authRouter);

// A partir daqui, toda rota /api exige um token valido no header Authorization
app.use("/api", autenticacaoObrigatoria);

app.use("/api/projetos", projetosRouter);
app.use("/api", pedagogicoRouter); // /api/projetos/:id/cursos, /api/cursos/:id/alunos, etc.
app.use("/api", financeiroRouter); // /api/projetos/:id/financeiro, /api/financeiro/:id/nf
app.use("/api", instrutoresRouter); // /api/instrutores
app.use("/api", gestaoFinanceiraRouter);

app.use((erro, req, res, next) => {
  console.error("Erro interno:", erro.message);
  if (res.headersSent) return next(erro);
  if (erro.code === "23505") return res.status(409).json({ erro: "Registro duplicado" });
  if (["23503", "23514", "22P02"].includes(erro.code)) return res.status(400).json({ erro: "Dados inválidos ou relacionamento inexistente" });
  res.status(500).json({ erro: "Erro interno ao acessar os dados" });
});

async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => console.log(`API do Sistema de Projetos rodando na porta ${PORT}`));
  } catch (erro) {
    console.error("Nao foi possivel inicializar o banco PostgreSQL:", erro.message);
    process.exitCode = 1;
  }
}
if (require.main === module) start();
module.exports = { app, start };
