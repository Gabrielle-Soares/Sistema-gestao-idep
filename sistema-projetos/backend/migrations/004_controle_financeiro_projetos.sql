-- Evolucao aditiva do controle financeiro. Nenhum registro existente e alterado.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil TEXT NOT NULL DEFAULT 'Administrador';
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_perfil_check CHECK (perfil IN ('Administrador','Pedagógico','Financeiro'));

ALTER TABLE projetos ADD COLUMN IF NOT EXISTS valor_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0);

ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS data_lancamento DATE;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS beneficiario_fornecedor TEXT;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS responsavel_lancamento TEXT;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS criado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS alterado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS justificativa_cancelamento TEXT;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE solicitacoes_financeiras ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Solicitado';
ALTER TABLE solicitacoes_financeiras ADD COLUMN IF NOT EXISTS financeiro_id BIGINT REFERENCES financeiro(id) ON DELETE SET NULL;
ALTER TABLE solicitacoes_financeiras ADD COLUMN IF NOT EXISTS criado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE solicitacoes_financeiras ADD COLUMN IF NOT EXISTS alterado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE solicitacoes_financeiras ADD COLUMN IF NOT EXISTS justificativa_cancelamento TEXT;
ALTER TABLE solicitacoes_financeiras ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS uq_financeiro_solicitacao ON solicitacoes_financeiras(financeiro_id) WHERE financeiro_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financeiro_projeto_status_data ON financeiro(projeto_id,status,data_lancamento);
CREATE INDEX IF NOT EXISTS idx_financeiro_curso ON financeiro(curso_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_financeiras(status);
