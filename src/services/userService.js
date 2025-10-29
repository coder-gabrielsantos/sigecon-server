const {
  createUser,
  findUserByCPF,
  findUserById,
  findUserAuthById,
  updateUserPassword
} = require("../db/queries/users.queries");

const { hashPassword, comparePassword } = require("../utils/hashPassword");
const generateInitialPassword = require("../utils/generateInitialPassword");
const { ROLE_ADMIN, ROLE_OPERADOR } = require("../utils/roleConstants");

/**
 * ADMIN cria novo usuário (ADMIN ou OPERADOR)
 */
async function adminCreateUser({ nome, cpf, role }) {
  if (role !== ROLE_ADMIN && role !== ROLE_OPERADOR) {
    const err = new Error("Role inválida");
    err.status = 400;
    throw err;
  }

  const existing = await findUserByCPF(cpf);
  if (existing) {
    const err = new Error("Já existe usuário com este CPF");
    err.status = 409;
    throw err;
  }

  const senhaInicial = generateInitialPassword();
  const senhaHash = await hashPassword(senhaInicial);

  const newUserId = await createUser({
    nome,
    cpf,
    senhaHash,
    role
  });

  return {
    id: newUserId,
    nome,
    cpf,
    role,
    senha_inicial: senhaInicial
  };
}

/**
 * Retorna dados do próprio usuário logado
 */
async function getMyProfile(userId) {
  const u = await findUserById(userId);

  if (!u) {
    const err = new Error("Usuário não encontrado");
    err.status = 404;
    throw err;
  }

  if (u.ativo === 0) {
    const err = new Error("Usuário inativo");
    err.status = 403;
    throw err;
  }

  return {
    id: u.id,
    nome: u.nome,
    cpf: u.cpf,
    role: u.role,
    precisaTrocarSenha: !!u.precisaTrocarSenha,
    ativo: !!u.ativo
  };
}

/**
 * Trocar a própria senha
 * - valida senha atual
 * - define senha nova
 * - limpa flag precisa_trocar_senha
 */
async function changeMyPassword(userId, senhaAtual, senhaNova) {
  // Buscar dados sensíveis do usuário
  const u = await findUserAuthById(userId);

  if (!u) {
    const err = new Error("Usuário não encontrado");
    err.status = 404;
    throw err;
  }

  if (u.ativo === 0) {
    const err = new Error("Usuário inativo");
    err.status = 403;
    throw err;
  }

  // conferir senha atual
  const ok = await comparePassword(senhaAtual, u.senhaHash);
  if (!ok) {
    const err = new Error("Senha atual incorreta");
    err.status = 401;
    throw err;
  }

  // gerar hash da nova senha
  const novaHash = await hashPassword(senhaNova);

  // atualizar banco e marcar que já não precisa trocar senha
  await updateUserPassword(userId, novaHash, false);

  return { success: true };
}

module.exports = {
  adminCreateUser,
  getMyProfile,
  changeMyPassword
};
