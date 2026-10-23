-- =============================================================================
-- Supabase Storage: buckets e políticas do Sistema de Chamados
-- Executar UMA vez no Supabase APÓS o deploy: Dashboard → SQL Editor → New query →
-- colar este arquivo → Run. É idempotente (pode rodar de novo sem efeitos colaterais).
-- =============================================================================

-- 1) Buckets PRIVADOS (public = false): nada é acessível por URL pública.
--    file_size_limit = null → vale o "Global file size limit" do projeto
--    (Storage → Settings). A aplicação não impõe limite próprio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('chamados-anexos', 'chamados-anexos', false, null, null), -- anexos de chamados e acompanhamentos
    ('sistema',         'sistema',         false, null, null)  -- reservado (ex.: logo do sistema); ainda não usado
on conflict (id) do update
    set public = false;

-- Se usar outro nome via STORAGE_BUCKET, troque 'chamados-anexos' acima e nas políticas abaixo.

-- 2) Políticas de acesso
-- O backend usa a service role key, que ignora RLS. O navegador nunca acessa os buckets com
-- a própria sessão: envia via token de upload assinado e baixa via URL assinada, ambos gerados
-- pelo backend para um caminho específico e com validade curta.
--
-- Sem nenhuma política, anon e authenticated já não têm acesso (o RLS de storage.objects nega
-- por padrão). A política RESTRITIVA abaixo garante isso mesmo que alguém crie, no futuro, uma
-- política permissiva genérica (ex.: "authenticated pode ler tudo").
drop policy if exists "chamados: sem acesso direto aos buckets privados" on storage.objects;
create policy "chamados: sem acesso direto aos buckets privados"
    on storage.objects
    as restrictive
    for all
    to anon, authenticated
    using (bucket_id not in ('chamados-anexos', 'sistema'))
    with check (bucket_id not in ('chamados-anexos', 'sistema'));

-- 3) Conferência (deve listar os 2 buckets com public = false)
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
 where id in ('chamados-anexos', 'sistema');

-- Estrutura esperada dentro de 'chamados-anexos' (criada automaticamente pelos uploads):
--   projetos/{projetoId}/chamados/{chamadoId}/abertura/{anexoId}-{nome-sanitizado}
--   projetos/{projetoId}/chamados/{chamadoId}/acompanhamentos/{acompanhamentoId}/{anexoId}-{nome-sanitizado}
