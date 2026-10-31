-- No Supabase, toda tabela de public fica exposta pela API REST (PostgREST) aos papéis anon e
-- authenticated, e a chave pública chega ao navegador no upload dos anexos. O RLS sem políticas
-- bloqueia esse acesso; o backend continua lendo e gravando porque é o dono das tabelas.
-- As tabelas da V1 a V3 tiveram o RLS ligado no painel; a chamado_responsavel (V4) ficou de fora.
-- Toda tabela nova deve ligar o RLS na própria migration.
ALTER TABLE chamado_responsavel ENABLE ROW LEVEL SECURITY;
