ALTER TABLE alunos ADD COLUMN IF NOT EXISTS chave_pix TEXT;

CREATE TABLE IF NOT EXISTS funcionarios (
  id BIGSERIAL PRIMARY KEY, nome TEXT NOT NULL, cpf TEXT NOT NULL UNIQUE,
  chave_pix TEXT NOT NULL DEFAULT '', cargo TEXT NOT NULL DEFAULT '',
  setor TEXT NOT NULL CHECK (setor IN ('Administrativo','Pedagógico','Outro')),
  tipo_vinculo TEXT NOT NULL DEFAULT '', telefone TEXT, email TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Inativo')),
  observacoes TEXT, criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagamentos_funcionarios (
  id BIGSERIAL PRIMARY KEY, funcionario_id BIGINT NOT NULL REFERENCES funcionarios(id),
  projeto_id BIGINT REFERENCES projetos(id) ON DELETE SET NULL,
  competencia TEXT NOT NULL, data_pagamento DATE, descricao TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente','Programado','Pago','Cancelado')),
  responsavel TEXT, observacoes TEXT, financeiro_id BIGINT REFERENCES financeiro(id) ON DELETE SET NULL,
  criado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS folhas_auxilio_transporte (
  id BIGSERIAL PRIMARY KEY, projeto_id BIGINT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  curso_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  periodo_inicial DATE NOT NULL, periodo_final DATE NOT NULL,
  valor_diario NUMERIC(12,2) NOT NULL DEFAULT 9 CHECK (valor_diario >= 0),
  responsavel TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Em preenchimento'
    CHECK (status IN ('Em preenchimento','Pronta para pagamento','Paga','Cancelada')),
  financeiro_id BIGINT REFERENCES financeiro(id) ON DELETE SET NULL,
  criado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (periodo_final >= periodo_inicial), UNIQUE (curso_id, periodo_inicial, periodo_final)
);

CREATE TABLE IF NOT EXISTS itens_auxilio_transporte (
  id BIGSERIAL PRIMARY KEY, folha_id BIGINT NOT NULL REFERENCES folhas_auxilio_transporte(id) ON DELETE CASCADE,
  aluno_id BIGINT NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
  quantidade_presencas INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_presencas >= 0),
  valor_diario NUMERIC(12,2) NOT NULL DEFAULT 9 CHECK (valor_diario >= 0),
  valor_total NUMERIC(14,2) GENERATED ALWAYS AS (quantidade_presencas * valor_diario) STORED,
  status TEXT NOT NULL DEFAULT 'Aguardando validação'
    CHECK (status IN ('Dados incompletos','Aguardando validação','Pronto para pagamento','Pago','Pagamento não realizado')),
  data_pagamento DATE, responsavel_pagamento TEXT, observacoes TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (folha_id, aluno_id)
);

CREATE TABLE IF NOT EXISTS anexos_pagamentos (
  id BIGSERIAL PRIMARY KEY, pagamento_funcionario_id BIGINT REFERENCES pagamentos_funcionarios(id) ON DELETE CASCADE,
  item_auxilio_id BIGINT REFERENCES itens_auxilio_transporte(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, arquivo TEXT NOT NULL, nome_original TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (num_nonnulls(pagamento_funcionario_id, item_auxilio_id) = 1)
);

CREATE TABLE IF NOT EXISTS historico_alteracoes (
  id BIGSERIAL PRIMARY KEY, entidade TEXT NOT NULL, entidade_id BIGINT NOT NULL,
  acao TEXT NOT NULL, dados JSONB, usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS curso_id BIGINT REFERENCES cursos(id) ON DELETE SET NULL;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS funcionario_id BIGINT REFERENCES funcionarios(id) ON DELETE SET NULL;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS folha_auxilio_id BIGINT REFERENCES folhas_auxilio_transporte(id) ON DELETE SET NULL;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS valor NUMERIC(14,2);
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pendente';
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS data_pagamento DATE;
ALTER TABLE financeiro ALTER COLUMN projeto_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_funcionarios_setor_status ON funcionarios(setor,status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionario ON pagamentos_funcionarios(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_projeto_status ON pagamentos_funcionarios(projeto_id,status);
CREATE INDEX IF NOT EXISTS idx_folhas_projeto_curso ON folhas_auxilio_transporte(projeto_id,curso_id);
CREATE INDEX IF NOT EXISTS idx_itens_auxilio_aluno ON itens_auxilio_transporte(aluno_id);
CREATE INDEX IF NOT EXISTS idx_historico_entidade ON historico_alteracoes(entidade,entidade_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_financeiro_folha_auxilio ON financeiro(folha_auxilio_id) WHERE folha_auxilio_id IS NOT NULL;
