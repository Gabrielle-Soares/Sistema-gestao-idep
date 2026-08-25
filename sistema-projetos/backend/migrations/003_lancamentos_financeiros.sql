-- Amplia o financeiro sem substituir os fluxos existentes de funcionários e auxílio.
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS tipo_pagamento TEXT;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS prestador_nome TEXT;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS categoria_detalhe TEXT;

-- Classifica apenas registros antigos ainda sem tipo, preservando suas categorias originais.
UPDATE financeiro
SET tipo_pagamento = CASE
  WHEN funcionario_id IS NOT NULL OR categoria = 'Pagamento de funcionário' THEN 'Funcionário'
  WHEN folha_auxilio_id IS NOT NULL OR categoria ILIKE '%auxílio%' THEN 'Auxílio'
  ELSE 'Outros'
END
WHERE tipo_pagamento IS NULL;

CREATE INDEX IF NOT EXISTS idx_financeiro_tipo_data ON financeiro(tipo_pagamento, data_pagamento);
CREATE INDEX IF NOT EXISTS idx_financeiro_prestador ON financeiro(prestador_nome);
