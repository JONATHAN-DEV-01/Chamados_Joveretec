CREATE TABLE usuario (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome          VARCHAR(120) NOT NULL,
    email         VARCHAR(160) NOT NULL,
    senha_hash    VARCHAR(100) NOT NULL,
    perfil        VARCHAR(20)  NOT NULL CHECK (perfil IN ('ADMIN', 'DESENVOLVEDOR')),
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_usuario_email ON usuario (lower(email));

CREATE TABLE projeto (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome          VARCHAR(120) NOT NULL,
    descricao     TEXT,
    arquivado     BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_projeto_nome ON projeto (lower(nome));

CREATE TABLE chamado (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    projeto_id     BIGINT       NOT NULL REFERENCES projeto (id),
    titulo         VARCHAR(200) NOT NULL,
    descricao      TEXT         NOT NULL,
    urgencia       VARCHAR(10)  NOT NULL CHECK (urgencia IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    urgencia_peso  SMALLINT GENERATED ALWAYS AS (
                       CASE urgencia
                           WHEN 'CRITICA' THEN 4
                           WHEN 'ALTA' THEN 3
                           WHEN 'MEDIA' THEN 2
                           ELSE 1
                       END) STORED,
    status         VARCHAR(15)  NOT NULL DEFAULT 'ABERTO'
                       CHECK (status IN ('ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO')),
    posicao        INTEGER      NOT NULL CHECK (posicao >= 1),
    responsavel_id BIGINT REFERENCES usuario (id),
    criado_por_id  BIGINT       NOT NULL REFERENCES usuario (id),
    versao         BIGINT       NOT NULL DEFAULT 0,
    criado_em      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_chamado_projeto_posicao ON chamado (projeto_id, posicao);
CREATE INDEX ix_chamado_ordenacao ON chamado (urgencia_peso DESC, posicao);
CREATE INDEX ix_chamado_responsavel ON chamado (responsavel_id);
CREATE INDEX ix_chamado_status ON chamado (status);
CREATE INDEX ix_chamado_urgencia ON chamado (urgencia);
CREATE INDEX ix_chamado_criado_por ON chamado (criado_por_id);

CREATE TABLE historico_chamado (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chamado_id     BIGINT      NOT NULL REFERENCES chamado (id) ON DELETE CASCADE,
    usuario_id     BIGINT      NOT NULL REFERENCES usuario (id),
    campo          VARCHAR(30) NOT NULL,
    valor_anterior TEXT,
    valor_novo     TEXT,
    alterado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_historico_chamado ON historico_chamado (chamado_id, alterado_em DESC);
CREATE INDEX ix_historico_usuario ON historico_chamado (usuario_id);

CREATE TABLE configuracao (
    chave             VARCHAR(60)  PRIMARY KEY,
    valor             VARCHAR(500) NOT NULL,
    atualizado_em     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_por_id BIGINT REFERENCES usuario (id)
);
