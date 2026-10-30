-- A fila do projeto passa a ter só chamados ativos (Aberto e Em andamento).
-- Concluídos ficam sem posição; os ativos são renumerados 1..n por projeto, mantendo a ordem atual.
ALTER TABLE chamado ALTER COLUMN posicao DROP NOT NULL;

UPDATE chamado SET posicao = NULL WHERE status = 'CONCLUIDO';

UPDATE chamado c
   SET posicao = fila.nova
  FROM (SELECT id, row_number() OVER (PARTITION BY projeto_id ORDER BY posicao, id) AS nova
          FROM chamado
         WHERE status <> 'CONCLUIDO') fila
 WHERE c.id = fila.id
   AND c.posicao IS DISTINCT FROM fila.nova;

ALTER TABLE chamado ADD CONSTRAINT ck_chamado_posicao_so_ativos
    CHECK ((status = 'CONCLUIDO') = (posicao IS NULL));
