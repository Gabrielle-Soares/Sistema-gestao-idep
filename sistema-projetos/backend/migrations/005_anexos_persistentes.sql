-- Mantem novos anexos no PostgreSQL para sobreviver a deploys e reinicios do Render.
-- Os nomes/caminhos antigos sao preservados para compatibilidade e eventual recuperacao.
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS nf_conteudo BYTEA;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS nf_mime TEXT;
ALTER TABLE anexos_pagamentos ADD COLUMN IF NOT EXISTS conteudo BYTEA;
ALTER TABLE anexos_pagamentos ADD COLUMN IF NOT EXISTS mime TEXT;
