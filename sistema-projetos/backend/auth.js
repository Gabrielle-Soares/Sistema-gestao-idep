const jwt = require("jsonwebtoken");

// Em producao, defina a variavel de ambiente JWT_SECRET com um valor proprio
// (ex: JWT_SECRET=uma-frase-longa-e-aleatoria node server.js).
// Sem isso, um valor padrao e usado - o suficiente para uso local/interno.
const JWT_SECRET = process.env.JWT_SECRET || "idep-sistema-projetos-chave-local";
const EXPIRA_EM = "12h";

function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id, usuario: usuario.usuario, nome: usuario.nome }, JWT_SECRET, {
    expiresIn: EXPIRA_EM,
  });
}

function autenticacaoObrigatoria(req, res, next) {
  const header = req.headers.authorization || "";
  // Aceita o token tanto no header Authorization quanto via ?token=
  // (necessario para links abertos diretamente pelo navegador, como o
  // download do PDF da lista e da NF, que nao permitem enviar headers).
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.query.token || null;

  if (!token) {
    return res.status(401).json({ erro: "Nao autenticado" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (e) {
    return res.status(401).json({ erro: "Sessao invalida ou expirada" });
  }
}

module.exports = { gerarToken, autenticacaoObrigatoria, JWT_SECRET };
