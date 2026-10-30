-- Um chamado pode ter vários responsáveis (nenhum = "sem responsável").
CREATE TABLE chamado_responsavel (
    chamado_id   BIGINT      NOT NULL REFERENCES chamado (id) ON DELETE CASCADE,
    usuario_id   BIGINT      NOT NULL REFERENCES usuario (id),
    atribuido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (chamado_id, usuario_id)
);
CREATE INDEX ix_chamado_responsavel_usuario ON chamado_responsavel (usuario_id);

-- Leva o responsável único de cada chamado para a nova tabela.
INSERT INTO chamado_responsavel (chamado_id, usuario_id, atribuido_em)
SELECT id, responsavel_id, atualizado_em
  FROM chamado
 WHERE responsavel_id IS NOT NULL;

-- A coluna antiga deixa de ser usada pela aplicação, mas fica até uma próxima migration:
-- durante o deploy a versão anterior ainda roda por alguns segundos e depende dela.
COMMENT ON COLUMN chamado.responsavel_id IS 'Obsoleta desde a V4: use chamado_responsavel.';
