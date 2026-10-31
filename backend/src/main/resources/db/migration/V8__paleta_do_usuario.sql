-- Paleta pessoal de cada usuário, aplicada só na sessão dele por cima da paleta global (configuracao).
-- Tudo nulo = segue a paleta global; as quatro cores andam sempre juntas.
ALTER TABLE usuario
    ADD COLUMN paleta_fundo      VARCHAR(7),
    ADD COLUMN paleta_superficie VARCHAR(7),
    ADD COLUMN paleta_destaque   VARCHAR(7),
    ADD COLUMN paleta_texto      VARCHAR(7),
    ADD CONSTRAINT ck_usuario_paleta CHECK (
        (paleta_fundo IS NULL AND paleta_superficie IS NULL AND paleta_destaque IS NULL AND paleta_texto IS NULL)
        OR (paleta_fundo ~ '^#[0-9A-F]{6}$' AND paleta_superficie ~ '^#[0-9A-F]{6}$'
            AND paleta_destaque ~ '^#[0-9A-F]{6}$' AND paleta_texto ~ '^#[0-9A-F]{6}$'));
