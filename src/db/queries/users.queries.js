const db = require("../../config/db");

/**
 * Busca usuário pelo CNPJ (para login e validação de duplicado)
 */
async function findUserByCNPJ(cnpj) {
  const [rows] = await db.query(
    `SELECT
         id,
         nome,
         cnpj,
         senha_hash           AS senhaHash,
         role,
         precisa_trocar_senha AS precisaTrocarSenha,
         ativo,
         admin_id             AS adminId
     FROM users
     WHERE cnpj = ? LIMIT 1`,
    [cnpj]
  );
  return rows[0];
}

/**
 * Cria um novo usuário (ADMIN criando OPERADOR ou outro ADMIN)
 * - adminId é opcional; para OPERADOR você passa o id do admin dono
 *   e para ADMIN você pode passar null ou o próprio id depois via update.
 */
async function createUser({ nome, cnpj, senhaHash, role, adminId = null }) {
  const [result] = await db.query(
    `INSERT INTO users
         (nome, cnpj, senha_hash, role, precisa_trocar_senha, ativo, admin_id)
     VALUES (?, ?, ?, ?, 1, 1, ?)`,
    [nome, cnpj, senhaHash, role, adminId]
  );

  return result.insertId;
}

/**
 * Busca um usuário pelo id (para /usuarios/me depois)
 * (já traz o adminId e o nome do admin, se tiver)
 */
async function findUserById(id) {
  const [rows] = await db.query(
    `SELECT
         u.id,
         u.nome,
         u.cnpj,
         u.role,
         u.precisa_trocar_senha AS precisaTrocarSenha,
         u.ativo,
         u.admin_id             AS adminId,
         a.nome                 AS adminNome
     FROM users u
              LEFT JOIN users a ON a.id = u.admin_id
     WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
}

/**
 * Busca apenas dados necessários para validar senha
 */
async function findUserAuthById(id) {
  const [rows] = await db.query(
    `SELECT
         id,
         senha_hash           AS senhaHash,
         precisa_trocar_senha AS precisaTrocarSenha,
         ativo
     FROM users
     WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
}

/**
 * Atualiza a senha do usuário + flag de precisar trocar
 */
async function updateUserPassword(userId, newHash, precisaTrocarSenha) {
  await db.query(
    `UPDATE users
     SET senha_hash = ?,
         precisa_trocar_senha = ?
     WHERE id = ?`,
    [newHash, precisaTrocarSenha ? 1 : 0, userId]
  );
}

/**
 * Atualiza apenas o nome do usuário
 */
async function updateUserName(userId, nome) {
  await db.query(
    `UPDATE users
     SET nome = ?
     WHERE id = ?`,
    [nome, userId]
  );
}

/**
 * Atualiza o admin_id de um usuário (usado para vincular operador/admin)
 */
async function updateUserAdminId(userId, adminId) {
  await db.query(
    `UPDATE users
     SET admin_id = ?
     WHERE id = ?`,
    [adminId, userId]
  );
}

/**
 * Lista todos os usuários (para tela de administração)
 * (inclui adminId e nome do admin, caso queira exibir no futuro)
 */
async function listAllUsers() {
  const [rows] = await db.query(
    `SELECT
       u.id,
       u.nome,
       u.cnpj,
       u.role,
       u.ativo,
       u.admin_id   AS adminId,
       a.nome       AS adminNome
     FROM users u
     LEFT JOIN users a ON a.id = u.admin_id
     ORDER BY u.nome ASC`
  );
  return rows;
}

module.exports = {
  findUserByCNPJ,
  createUser,
  findUserById,
  findUserAuthById,
  updateUserPassword,
  updateUserName,
  updateUserAdminId,
  listAllUsers,
};
