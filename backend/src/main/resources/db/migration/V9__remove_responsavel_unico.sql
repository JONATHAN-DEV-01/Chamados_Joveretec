-- A coluna do responsável único deixou de ser usada na V4 (tabela chamado_responsavel) e foi
-- mantida só durante a transição do deploy. Sai junto com o índice dela.
DROP INDEX IF EXISTS ix_chamado_responsavel;
ALTER TABLE chamado DROP COLUMN responsavel_id;
