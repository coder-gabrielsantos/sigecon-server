CREATE DATABASE IF NOT EXISTS sigecon;
USE sigecon;

-- ======================
-- TABELA DE USUÁRIOS
-- ======================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'OPERADOR') NOT NULL DEFAULT 'OPERADOR',
    precisa_trocar_senha TINYINT(1) NOT NULL DEFAULT 1,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

-- Usuário admin inicial (seed)
INSERT INTO users (nome, cpf, senha_hash, role, precisa_trocar_senha, ativo)
VALUES (
           'Administrador Inicial',
           '00000000000',
           '$2b$10$WWDE6WEc8TJWv4ukhipcyuXUQDzC9/nhlQwukDCsNt3DNek.jkTZu', -- senha: pass
           'ADMIN',
           0,
           1
);
