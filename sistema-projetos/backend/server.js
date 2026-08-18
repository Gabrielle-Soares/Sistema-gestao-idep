const express = require("express");
const cors = require("cors");

const { autenticacaoObrigatoria } = require("./auth");
const authRouter = require("./routes/auth");
const projetosRouter = require("./routes/projetos");
const pedagogicoRouter = require("./routes/pedagogico");
const financeiroRouter = require("./routes/financeiro");
const instrutoresRouter = require("./routes/instrutores");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Rotas publicas (login)
app.use("/api/auth", authRouter);

// A partir daqui, toda rota /api exige um token valido no header Authorization
app.use("/api", autenticacaoObrigatoria);

app.use("/api/projetos", projetosRouter);
app.use("/api", pedagogicoRouter); // /api/projetos/:id/cursos, /api/cursos/:id/alunos, etc.
app.use("/api", financeiroRouter); // /api/projetos/:id/financeiro, /api/financeiro/:id/nf
app.use("/api", instrutoresRouter); // /api/instrutores

app.listen(PORT, () => {
  console.log(`API do Sistema de Projetos rodando em http://localhost:${PORT}`);
});
