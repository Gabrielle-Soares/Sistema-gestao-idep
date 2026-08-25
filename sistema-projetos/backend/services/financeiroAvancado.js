const db = require("../db");

const STATUS_ITEM = new Set(["Dados incompletos","Aguardando validação","Pronto para pagamento","Pago","Pagamento não realizado"]);

function validarPronto(aluno, presencas, valorTotal) {
  const faltantes = [];
  if (!aluno?.nome) faltantes.push("nome");
  if (!aluno?.chave_pix) faltantes.push("chave Pix");
  if (Number(presencas) < 1) faltantes.push("presença");
  if (Number(valorTotal) <= 0) faltantes.push("valor total");
  return faltantes;
}

async function historico(client, entidade, entidadeId, acao, dados, usuarioId) {
  await client.query("INSERT INTO historico_alteracoes (entidade,entidade_id,acao,dados,usuario_id) VALUES ($1,$2,$3,$4,$5)", [entidade, entidadeId, acao, dados, usuarioId]);
}

async function sincronizarFinanceiro(client, folhaId) {
  const folha = (await client.query(`SELECT f.*, COALESCE(SUM(i.valor_total) FILTER (WHERE i.status='Pago'),0) total_pago,
    COALESCE(SUM(i.valor_total),0) total_folha FROM folhas_auxilio_transporte f LEFT JOIN itens_auxilio_transporte i ON i.folha_id=f.id WHERE f.id=$1 GROUP BY f.id`, [folhaId])).rows[0];
  if (!folha || !["Pronta para pagamento","Paga"].includes(folha.status)) return;
  const valor = folha.status === "Paga" ? folha.total_pago : folha.total_folha;
  const result = await client.query(`INSERT INTO financeiro
    (projeto_id,curso_id,folha_auxilio_id,categoria,tipo_pagamento,valor,status,descricao,data_pagamento)
    VALUES ($1,$2,$3,'Auxílio-transporte de aluno','Auxílio',$4,$5,$6,$7)
    ON CONFLICT (folha_auxilio_id) WHERE folha_auxilio_id IS NOT NULL DO UPDATE SET
      valor=EXCLUDED.valor,status=EXCLUDED.status,descricao=EXCLUDED.descricao,data_pagamento=EXCLUDED.data_pagamento
    RETURNING id`, [folha.projeto_id, folha.curso_id, folha.id, valor, folha.status === "Paga" ? "Pago" : "Programado", `Folha de auxílio-transporte ${folha.periodo_inicial} a ${folha.periodo_final}`, folha.status === "Paga" ? new Date() : null]);
  await client.query("UPDATE folhas_auxilio_transporte SET financeiro_id=$1 WHERE id=$2", [result.rows[0].id, folhaId]);
}

async function atualizarItem(folhaId, itemId, dados, usuarioId) {
  return db.transaction(async (client) => {
    const atual = (await client.query(`SELECT i.*,a.nome,a.chave_pix FROM itens_auxilio_transporte i JOIN alunos a ON a.id=i.aluno_id WHERE i.id=$1 AND i.folha_id=$2 FOR UPDATE`, [itemId, folhaId])).rows[0];
    if (!atual) return null;
    const presencas = Number(dados.quantidade_presencas ?? atual.quantidade_presencas);
    const valorDiario = Number(dados.valor_diario ?? atual.valor_diario);
    if (!Number.isInteger(presencas) || presencas < 0 || !Number.isFinite(valorDiario) || valorDiario < 0) throw new Error("Presenças e valor diário não podem ser negativos");
    const status = dados.status || atual.status;
    if (!STATUS_ITEM.has(status)) throw new Error("Status individual inválido");
    const faltantes = validarPronto(atual, presencas, presencas * valorDiario);
    if (["Pronto para pagamento","Pago"].includes(status) && faltantes.length) throw new Error(`Dados faltantes: ${faltantes.join(", ")}`);
    const item = (await client.query(`UPDATE itens_auxilio_transporte SET quantidade_presencas=$1,valor_diario=$2,status=$3,
      data_pagamento=$4,responsavel_pagamento=$5,observacoes=$6,atualizado_em=CURRENT_TIMESTAMP WHERE id=$7 RETURNING *`,
      [presencas,valorDiario,status,dados.data_pagamento ?? atual.data_pagamento,dados.responsavel_pagamento ?? atual.responsavel_pagamento,dados.observacoes ?? atual.observacoes,itemId])).rows[0];
    await historico(client,"item_auxilio_transporte",itemId,"atualizado",dados,usuarioId);
    return { ...item, faltantes: validarPronto(atual,item.quantidade_presencas,item.valor_total) };
  });
}

module.exports = { validarPronto, historico, sincronizarFinanceiro, atualizarItem };
