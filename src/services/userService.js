const { createUser, findUserByCPF, findUserById } = require("../db/queries/users.queries");
const { hashPassword } = require("../utils/hashPassword");
const generateInitialPassword = require("../utils/generateInitialPassword");
const { ROLE_ADMIN, ROLE_OPERADOR } = require("../utils/roleConstants");

/**
 * ADMIN cria novo usuário (ADMIN ou OPERADOR)
 */
async function adminCreateUser({ nome, cpf, role }) {
  // validar role recebida
  if (role !== ROLE_ADMIN && role !== ROLE_OPERADOR) {
    const err = new Error("Role inválida");
    err.status = 400;
    throw err;
  }

  // checar duplicidade de CPF
  const existing = await findUserByCPF(cpf);
  if (existing) {
    const err = new Error("Já existe usuário com este CPF");
    err.status = 409;
    throw err;
  }

  // gerar senha inicial
  const senhaInicial = generateInitialPassword();

  // gerar hash
  const senhaHash = await hashPassword(senhaInicial);

  // criar usuário no banco
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

  // retorna só dados não sensíveis
  return {
    id: u.id,
    nome: u.nome,
    cpf: u.cpf,
    role: u.role,
    precisaTrocarSenha: !!u.precisaTrocarSenha,
    ativo: !!u.ativo
  };
}

module.exports = {
  adminCreateUser,
  getMyProfile
};
