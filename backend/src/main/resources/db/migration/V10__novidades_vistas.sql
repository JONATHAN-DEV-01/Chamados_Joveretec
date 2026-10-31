-- Última versão das "Novidades da plataforma" que cada usuário já viu (0 = nenhuma). O pop-up
-- aparece uma vez por pessoa sempre que o frontend publicar uma versão maior.
ALTER TABLE usuario ADD COLUMN novidades_vistas_versao INTEGER NOT NULL DEFAULT 0
    CONSTRAINT ck_usuario_novidades_versao CHECK (novidades_vistas_versao >= 0);
