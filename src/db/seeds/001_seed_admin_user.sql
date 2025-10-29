-- Cria o usuário administrador inicial do sistema
-- Pode alterar o CPF conforme o cliente desejar
-- Senha padrão (antes do hash): Admin@123

INSERT INTO users (nome, cpf, senha_hash, role, precisa_trocar_senha, ativo)
VALUES (
    'admin',
    '00000000000',
    '$2a$10$8B7bHh5cjkSm2cDfwzXCRu7ZJxhJkaJ5Inwqbf7Dtdbo34dcQv.YW',
    'ADMIN',
    0,
    1
);
