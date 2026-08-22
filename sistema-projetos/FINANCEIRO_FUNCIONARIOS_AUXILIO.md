# Funcionários, pagamentos e auxílio-transporte

## Migration

A migration incremental `backend/migrations/002_funcionarios_auxilio.sql` não remove nem recria tabelas. Ela é aplicada automaticamente na inicialização e registrada em `schema_migrations`. Para aplicá-la manualmente antes do deploy:

```powershell
cd backend
$env:DATABASE_URL='URL EXTERNA DO POSTGRESQL'
$env:DATABASE_SSL='true'
npm run migrate:schema
```

## Estruturas novas

- `funcionarios`: cadastro por ID, CPF único, dados profissionais, contato e status.
- `pagamentos_funcionarios`: competência, projeto opcional, valor, status e responsável; integrado a `financeiro` por `financeiro_id`.
- `folhas_auxilio_transporte`: projeto, curso, período único, valor diário configurável e status.
- `itens_auxilio_transporte`: referencia o aluno existente, guarda presenças e calcula `valor_total` no PostgreSQL.
- `anexos_pagamentos`: comprovantes de pagamentos de funcionários ou itens de auxílio.
- `historico_alteracoes`: auditoria de criação, edição, status e pagamentos em lote.

Também foram adicionados campos relacionais em `financeiro` e `chave_pix` em `alunos`.

## Rotas novas

- `GET/POST /api/funcionarios`, `PUT /api/funcionarios/:id`
- `GET/POST /api/pagamentos-funcionarios`, `PUT /api/pagamentos-funcionarios/:id`
- `GET /api/financeiro` com filtros por projeto, curso, funcionário, setor, categoria, período e status
- `GET/POST /api/folhas-auxilio`
- `GET /api/folhas-auxilio/:id`
- `PUT /api/folhas-auxilio/:folhaId/itens/:itemId`
- `POST /api/folhas-auxilio/:id/pagamentos-lote`
- `PUT /api/folhas-auxilio/:id/status`
- `GET /api/folhas-auxilio/:id/pdf` e `/excel`
- `GET /api/historico/:entidade/:id`

## Regras

O total individual é calculado no banco como presenças × valor diário. Valores negativos são rejeitados. Um item só fica pronto/pago com nome, Pix, presença e total positivo. Curso/período não pode ter folha duplicada. Ao deixar a folha pronta ou paga, um único lançamento financeiro é criado/atualizado por `folha_auxilio_id`.

## Teste sugerido

1. Cadastre um aluno com CPF e Pix e um funcionário.
2. Registre pagamento do funcionário com e sem projeto.
3. Crie uma folha, informe presenças e valide o cálculo.
4. Tente liberar um aluno sem Pix para confirmar o bloqueio.
5. Marque itens prontos, pague em lote e finalize a folha.
6. Confira o lançamento financeiro e exporte PDF/Excel.
7. Reinicie o backend e confirme a persistência.

## Decisões pendentes

- A aplicação atual possui autenticação, mas não papéis. Todas as novas ações exigem login; perfis separados para aprovação e reabertura dependem da definição dos usuários/papéis autorizados.
- Não há tabela de frequência pedagógica; por isso as presenças são manuais, com estrutura pronta para integração futura.
- Anexos continuam no diretório `uploads`; no Render é necessário Persistent Disk ou armazenamento de objetos para retenção permanente.
