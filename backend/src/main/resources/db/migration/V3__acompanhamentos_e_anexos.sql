-- Última atividade do chamado (edições, acompanhamentos, anexos). Atualizada sem mexer na
-- coluna `versao`, para que um acompanhamento novo não gere conflito em quem está editando.
ALTER TABLE chamado ADD COLUMN ultima_atividade_em TIMESTAMPTZ;
UPDATE chamado SET ultima_atividade_em = atualizado_em;
ALTER TABLE chamado ALTER COLUMN ultima_atividade_em SET NOT NULL;
ALTER TABLE chamado ALTER COLUMN ultima_atividade_em SET DEFAULT now();

CREATE TABLE acompanhamento (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chamado_id          BIGINT      NOT NULL REFERENCES chamado (id) ON DELETE CASCADE,
    autor_id            BIGINT      NOT NULL REFERENCES usuario (id),
    -- RASCUNHO: criado para receber anexos antes da publicação (texto ainda vazio).
    situacao            VARCHAR(10) NOT NULL CHECK (situacao IN ('RASCUNHO', 'PUBLICADO')),
    tipo                VARCHAR(15) NOT NULL DEFAULT 'ACOMPANHAMENTO' CHECK (tipo IN ('ACOMPANHAMENTO', 'SOLUCAO')),
    texto               TEXT,
    tempo_gasto_minutos INTEGER CHECK (tempo_gasto_minutos >= 0),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    editado_em          TIMESTAMPTZ,
    CHECK (situacao = 'RASCUNHO' OR texto IS NOT NULL)
);
CREATE INDEX ix_acompanhamento_chamado ON acompanhamento (chamado_id, criado_em);
CREATE INDEX ix_acompanhamento_autor ON acompanhamento (autor_id);
CREATE INDEX ix_acompanhamento_recentes ON acompanhamento (criado_em DESC) WHERE situacao = 'PUBLICADO';

CREATE TABLE anexo (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chamado_id        BIGINT        NOT NULL REFERENCES chamado (id) ON DELETE CASCADE,
    acompanhamento_id BIGINT REFERENCES acompanhamento (id) ON DELETE CASCADE,
    nome_original     VARCHAR(255)  NOT NULL,
    caminho           VARCHAR(1024) NOT NULL,
    tipo_mime         VARCHAR(255)  NOT NULL,
    tamanho_bytes     BIGINT        NOT NULL CHECK (tamanho_bytes >= 0),
    status            VARCHAR(10)   NOT NULL CHECK (status IN ('PENDENTE', 'CONCLUIDO')),
    enviado_por_id    BIGINT        NOT NULL REFERENCES usuario (id),
    criado_em         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    concluido_em      TIMESTAMPTZ
);
CREATE INDEX ix_anexo_chamado ON anexo (chamado_id);
CREATE INDEX ix_anexo_acompanhamento ON anexo (acompanhamento_id);
CREATE INDEX ix_anexo_pendentes ON anexo (criado_em) WHERE status = 'PENDENTE';
CREATE INDEX ix_anexo_enviado_por ON anexo (enviado_por_id);
