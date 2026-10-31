-- Exclusão lógica de chamados (só administradores): o chamado some de todas as telas, mas a
-- linha, o histórico, os acompanhamentos e os anexos continuam no banco.
ALTER TABLE chamado
    ADD COLUMN excluido_em     TIMESTAMPTZ,
    ADD COLUMN excluido_por_id BIGINT REFERENCES usuario (id),
    ADD CONSTRAINT ck_chamado_exclusao CHECK ((excluido_em IS NULL) = (excluido_por_id IS NULL));

-- Excluído não fica na fila, qualquer que seja o status; os demais seguem a regra da V5.
ALTER TABLE chamado DROP CONSTRAINT ck_chamado_posicao_so_ativos;
ALTER TABLE chamado ADD CONSTRAINT ck_chamado_posicao_so_ativos CHECK (
    CASE WHEN excluido_em IS NULL THEN (status = 'CONCLUIDO') = (posicao IS NULL)
         ELSE posicao IS NULL END);
