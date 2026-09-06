const express = require("express");
const PDFDocument = require("pdfkit");
const db = require("../db");

const router = express.Router();
const STATUS_PAGO = "f.status IN ('Pago','Paga')";
const STATUS_APAGAR = "f.status IN ('A pagar','Pendente')";
const STATUS_SOLICITADO = "f.status IN ('Solicitado','Programado')";
const STATUS_VALIDO = "COALESCE(f.status,'') NOT IN ('Cancelado','Cancelada')";
const dataExpr = "COALESCE(f.data_lancamento,f.data_pagamento,f.criado_em::date)";
const beneficiarioExpr = "COALESCE(f.beneficiario_fornecedor,fn.nome,f.prestador_nome,'')";

function filtros(req, alias = "f") {
  const params = [], where = [];
  const add = (sql, valor) => { if (valor !== undefined && valor !== null && valor !== "") { params.push(valor); where.push(sql.replace("?", `$${params.length}`)); } };
  add(`${alias}.projeto_id=?`, req.query.projeto_id);
  add(`${alias}.curso_id=?`, req.query.curso_id);
  add(`COALESCE(c.municipio,${alias}.municipio,'') ILIKE ?`, req.query.municipio ? `%${req.query.municipio.trim()}%` : "");
  add(`${alias}.categoria=?`, req.query.categoria);
  add(`${alias}.status=?`, req.query.status);
  if(req.query.tipo_relatorio==="pagos")where.push(STATUS_PAGO);
  if(req.query.tipo_relatorio==="pendentes")where.push(`(${STATUS_APAGAR} OR ${STATUS_SOLICITADO})`);
  add(`${dataExpr} >= ?`, req.query.inicio);
  add(`${dataExpr} <= ?`, req.query.fim);
  add(`${beneficiarioExpr} ILIKE ?`, req.query.beneficiario ? `%${req.query.beneficiario.trim()}%` : "");
  if(req.usuario?.perfil==="Pedagógico"){params.push(req.usuario.id);where.push(`${alias}.criado_por=$${params.length}`);}
  return { params, where };
}

async function consultar(req) {
  const { params, where } = filtros(req);
  const clausula = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const registros = (await db.query(`SELECT f.*,p.nome projeto_nome,p.valor_total projeto_valor_total,c.nome curso_nome,
    COALESCE(c.municipio,f.municipio) municipio_exibicao,${beneficiarioExpr} beneficiario,
    COALESCE(u.nome,f.responsavel_lancamento) responsavel_nome,${dataExpr} data_exibicao
    FROM financeiro f LEFT JOIN projetos p ON p.id=f.projeto_id LEFT JOIN cursos c ON c.id=f.curso_id
    LEFT JOIN funcionarios fn ON fn.id=f.funcionario_id LEFT JOIN usuarios u ON u.id=f.criado_por
    ${clausula} ORDER BY ${dataExpr} DESC,f.id DESC`, params)).rows;
  const projetos = new Map();
  for (const r of registros) if (r.projeto_id && !projetos.has(String(r.projeto_id))) projetos.set(String(r.projeto_id), Number(r.projeto_valor_total || 0));
  if (!where.length || (req.query.projeto_id && !projetos.size)) {
    const ps = (await db.query(`SELECT id,valor_total FROM projetos ${req.query.projeto_id ? "WHERE id=$1" : ""}`, req.query.projeto_id ? [req.query.projeto_id] : [])).rows;
    ps.forEach(p => projetos.set(String(p.id), Number(p.valor_total || 0)));
  }
  const validos = registros.filter(r => !["Cancelado","Cancelada"].includes(r.status));
  const soma = lista => lista.reduce((t,r)=>t+Number(r.valor||0),0);
  const valorProjetos = [...projetos.values()].reduce((a,b)=>a+b,0);
  const totalLancado = soma(validos);
  return { registros, resumo: { quantidade_projetos: projetos.size, valor_total_projetos: valorProjetos, total_lancado: totalLancado,
    total_pago: soma(validos.filter(r=>["Pago","Paga"].includes(r.status))),
    total_a_pagar: soma(validos.filter(r=>["A pagar","Pendente"].includes(r.status))),
    total_solicitado: soma(validos.filter(r=>["Solicitado","Programado"].includes(r.status))),
    saldo_disponivel: valorProjetos-totalLancado } };
}

router.get("/financeiro/resumo", async (req,res) => res.json((await consultar(req)).resumo));
router.get("/projetos/:projetoId/financeiro/resumo", async (req,res) => {
  req.query.projeto_id=req.params.projetoId;
  res.json((await consultar(req)).resumo);
});

router.put("/financeiro/:id/status", async (req,res) => {
  if(!["A pagar","Solicitado","Pago","Cancelado"].includes(req.body.status)) return res.status(400).json({erro:"Status inválido"});
  if(req.usuario.perfil==="Pedagógico" && req.body.status!=="Solicitado") return res.status(403).json({erro:"O perfil Pedagógico somente pode registrar solicitações"});
  if(!["Administrador","Financeiro"].includes(req.usuario.perfil) && req.body.status==="Pago") return res.status(403).json({erro:"Somente Financeiro ou Administrador pode confirmar pagamentos"});
  const justificativa=String(req.body.justificativa_cancelamento||"").trim();
  if(req.body.status==="Cancelado"&&!justificativa)return res.status(400).json({erro:"Informe a justificativa do cancelamento"});
  const anterior=(await db.query("SELECT * FROM financeiro WHERE id=$1",[req.params.id])).rows[0];
  if(!anterior)return res.status(404).json({erro:"Lançamento não encontrado"});
  const row=await db.transaction(async client=>{
    const novo=(await client.query("UPDATE financeiro SET status=$1,justificativa_cancelamento=$2,alterado_por=$3,atualizado_em=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *",[req.body.status,justificativa||null,req.usuario.id,req.params.id])).rows[0];
    await client.query("UPDATE solicitacoes_financeiras SET status=$1,justificativa_cancelamento=$2,alterado_por=$3,atualizado_em=CURRENT_TIMESTAMP WHERE financeiro_id=$4",[req.body.status,justificativa||null,req.usuario.id,novo.id]);
    await client.query("INSERT INTO historico_alteracoes(entidade,entidade_id,acao,dados,usuario_id) VALUES('lancamento_financeiro',$1,'status',$2,$3)",[novo.id,{anterior:{status:anterior.status,valor:anterior.valor},novo:{status:novo.status,valor:novo.valor},justificativa:justificativa||null},req.usuario.id]);
    return novo;
  });
  res.json(row);
});

router.get("/financeiro/:id/historico", async(req,res)=>res.json((await db.query("SELECT h.*,u.nome usuario_nome FROM historico_alteracoes h LEFT JOIN usuarios u ON u.id=h.usuario_id WHERE h.entidade='lancamento_financeiro' AND h.entidade_id=$1 ORDER BY h.criado_em DESC",[req.params.id])).rows));

router.get("/financeiro/relatorio.pdf", async(req,res)=>{
  if(!["Administrador","Financeiro"].includes(req.usuario.perfil))return res.status(403).json({erro:"Relatórios financeiros são restritos ao Financeiro e Administrador"});
  const {registros,resumo}=await consultar(req);
  res.setHeader("Content-Type","application/pdf"); res.setHeader("Content-Disposition",'attachment; filename="relatorio-financeiro.pdf"');
  const doc=new PDFDocument({margin:38,size:"A4"}); doc.pipe(res);
  doc.font("Helvetica-Bold").fontSize(16).text("Relatório financeiro",{align:"center"});
  doc.font("Helvetica").fontSize(9).text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`,{align:"center"}).moveDown();
  const periodo=req.query.inicio||req.query.fim?`${req.query.inicio||"início"} a ${req.query.fim||"hoje"}`:"Todos os períodos";
  doc.fontSize(10).text(`Período selecionado: ${periodo}`);
  registros.forEach((r,i)=>{ if(doc.y>735)doc.addPage(); doc.moveDown(.45).font("Helvetica-Bold").text(`${i+1}. ${r.projeto_nome||"Sem projeto"} — ${r.descricao||r.categoria||"Lançamento"}`); doc.font("Helvetica").fontSize(9).text(`Curso: ${r.curso_nome||"-"} | Município: ${r.municipio_exibicao||"-"} | Data: ${r.data_exibicao||"-"}`); doc.text(`Beneficiário/fornecedor: ${r.beneficiario||"-"} | Status: ${r.status||"-"} | Valor: ${Number(r.valor||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`); });
  doc.moveDown().font("Helvetica-Bold").fontSize(10).text(`Total dos registros: ${Number(resumo.total_lancado).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`).text(`Total pago: ${Number(resumo.total_pago).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`).text(`Total pendente: ${Number(resumo.total_a_pagar+resumo.total_solicitado).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`).text(`Saldo disponível: ${Number(resumo.saldo_disponivel).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`);
  doc.end();
});

module.exports=router;
