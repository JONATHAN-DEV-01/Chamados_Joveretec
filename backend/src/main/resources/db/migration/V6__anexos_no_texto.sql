-- Anexos colados/arrastados na descrição de um chamado que ainda não existe: o arquivo é
-- enviado antes, sem chamado (rascunho do usuário), e é ligado ao chamado quando ele é criado.
-- Rascunhos não usados em 24h são removidos pela rotina de limpeza.
ALTER TABLE anexo ALTER COLUMN chamado_id DROP NOT NULL;
ALTER TABLE anexo ADD CONSTRAINT ck_anexo_rascunho_sem_acompanhamento
    CHECK (chamado_id IS NOT NULL OR acompanhamento_id IS NULL);
CREATE INDEX ix_anexo_rascunhos ON anexo (criado_em) WHERE chamado_id IS NULL;
