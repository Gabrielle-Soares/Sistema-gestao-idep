# Migração segura de SQLite para PostgreSQL

O backend usa `DATABASE_URL`; nenhuma credencial é enviada ao frontend. O arquivo `backend/sistema.db` não é modificado pelo migrador e deve continuar guardado como backup.

## Mapeamento do schema

As 10 tabelas são preservadas: `usuarios`, `projetos`, `instrutores`, `cursos`, `alunos`, `listas`, `financeiro`, `configuracao_institucional`, `solicitacoes_financeiras` e `solicitacao_financeira_itens`. `INTEGER PRIMARY KEY AUTOINCREMENT` virou `BIGSERIAL`; textos, nullability, defaults, `UNIQUE`, `CHECK` e ações de chaves estrangeiras foram mantidos. Os valores `REAL` financeiros viraram `DOUBLE PRECISION` para manter o contrato numérico atual. Foram criados índices nas chaves estrangeiras mais consultadas.

## Render

1. No painel do Render, crie um PostgreSQL na mesma região do Web Service.
2. No Web Service, adicione `DATABASE_URL` usando a Internal Database URL do banco.
3. O Render é detectado automaticamente e a conexão usa SSL. Fora dele, defina `DATABASE_SSL=true` se o provedor exigir SSL, ou `false` no PostgreSQL local.
4. Faça deploy com Root Directory `sistema-projetos/backend`, Build Command `npm ci` e Start Command `npm start`.
5. Para banco vazio, defina temporariamente `ADMIN_INITIAL_PASSWORD` (e, opcionalmente, `ADMIN_INITIAL_USER` e `ADMIN_INITIAL_NAME`). O usuário só é criado quando `usuarios` está vazia. Remova a senha inicial do ambiente depois do primeiro login e troque-a na aplicação.

## Migrar os dados existentes

Faça antes uma cópia adicional de `backend/sistema.db` e, se existirem, dos arquivos `sistema.db-wal` e `sistema.db-shm`. Pare o backend SQLite antes de copiar para garantir um snapshot consistente. No computador que contém o banco:

```powershell
cd sistema-projetos\backend
npm ci
$env:DATABASE_URL='postgresql://...'
$env:DATABASE_SSL='true'
npm run migrate:postgres
```

O script abre o SQLite como somente leitura, cria o schema incrementalmente, copia em ordem de dependência numa única transação, usa `ON CONFLICT (id) DO NOTHING`, preserva IDs e reajusta todas as sequences. Em erro crítico, executa rollback. Pode ser repetido sem duplicar IDs.

## Validação

Compare as contagens exibidas pelo migrador com as contagens do SQLite e consulte no PostgreSQL:

```sql
SELECT 'usuarios' tabela, COUNT(*) total FROM usuarios UNION ALL
SELECT 'projetos', COUNT(*) FROM projetos UNION ALL
SELECT 'instrutores', COUNT(*) FROM instrutores UNION ALL
SELECT 'cursos', COUNT(*) FROM cursos UNION ALL
SELECT 'alunos', COUNT(*) FROM alunos UNION ALL
SELECT 'listas', COUNT(*) FROM listas UNION ALL
SELECT 'financeiro', COUNT(*) FROM financeiro UNION ALL
SELECT 'configuracao_institucional', COUNT(*) FROM configuracao_institucional UNION ALL
SELECT 'solicitacoes_financeiras', COUNT(*) FROM solicitacoes_financeiras UNION ALL
SELECT 'solicitacao_financeira_itens', COUNT(*) FROM solicitacao_financeira_itens;
```

Depois teste login, CRUD de projetos/alunos/cursos/instrutores, financeiro, solicitações, PDFs/Excel, logout e persistência após reiniciar o serviço.

## Riscos e ações manuais

- Os anexos de notas fiscais permanecem em `backend/uploads`; o filesystem comum do Render é efêmero. Use Persistent Disk ou armazenamento de objetos antes de depender desses anexos em produção.
- O migrador resolve conflitos por ID sem sobrescrever registros já presentes. Portanto, migre preferencialmente para banco vazio; se houver dados prévios, valide conflitos manualmente.
- Valores financeiros continuam em ponto flutuante por compatibilidade. Uma evolução futura pode usar `NUMERIC`, com testes do formato retornado pela API.
- Não execute simultaneamente o backend antigo e o novo durante a virada; dados gravados no SQLite depois do snapshot não chegam automaticamente ao PostgreSQL.
