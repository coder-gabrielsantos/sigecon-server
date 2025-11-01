const db = require("../../config/db");

/**
 * Busca usuário pelo CPF (para login e validação de duplicado)
 */
async function findUserByCPF(cpf) {
  const [rows] = await db.query(
    `SELECT id,
            nome,
            cpf,
            senha_hash           AS senhaHash,
            role,
            precisa_trocar_senha AS precisaTrocarSenha,
            ativo
     FROM users
     WHERE cpf = ? LIMIT 1`,
    [cpf]
  );
  return rows[0];
}

/**
 * Cria um novo usuário (ADMIN criando OPERADOR ou outro ADMIN)
 */
async function createUser({ nome, cpf, senhaHash, role }) {
  const [result] = await db.query(
    `INSERT INTO users
         (nome, cpf, senha_hash, role, precisa_trocar_senha, ativo)
     VALUES (?, ?, ?, ?, 1, 1)`,
    [nome, cpf, senhaHash, role]
  );

  return result.insertId;
}

/**
 * Busca um usuário pelo id (para /usuarios/me depois)
 */
async function findUserById(id) {
  const [rows] = await db.query(
    `SELECT id,
            nome,
            cpf,
            role,
            precisa_trocar_senha AS precisaTrocarSenha,
            ativo
     FROM users
     WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
}

async function findUserAuthById(id) {
  const [rows] = await db.query(
    `SELECT id, senha_hash AS senhaHash,
            precisa_trocar_senha AS precisaTrocarSenha,
            ativo
     FROM users
     WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
}

async function updateUserPassword(userId, newHash, precisaTrocarSenha) {
  await db.query(
    `UPDATE users
     SET senha_hash = ?, precisa_trocar_senha = ?
     WHERE id = ?`,
    [newHash, precisaTrocarSenha ? 1 : 0, userId]
  );
}

module.exports = {
  findUserByCPF,
  createUser,
  findUserById,
  findUserAuthById,
  updateUserPassword
};
