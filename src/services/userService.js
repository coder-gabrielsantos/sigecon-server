const {
  createUser,
  findUserByCNPJ,
  findUserById,
  findUserAuthById,
  updateUserPassword,
  updateUserName,
  updateUserAdminId,
  listAllUsers,
} = require("../db/queries/users.queries");

const { hashPassword, comparePassword } = require("../utils/hashPassword");
const generateInitialPassword = require("../utils/generateInitialPassword");
const { ROLE_ADMIN, ROLE_OPERADOR } = require("../utils/roleConstants");

/**
 * ADMIN cria novo usuário (ADMIN ou OPERADOR)
 *
 * Parâmetros:
 * - nome
 * - cnpj (pode vir mascarado; será normalizado para apenas dígitos)
 * - role ("ADMIN" ou "OPERADOR")
 * - creatorAdminId -> id do admin autenticado que está criando o usuário
 */
async function adminCreateUser({ nome, cnpj, role, creatorAdminId }) {
  if (role !== ROLE_ADMIN && role !== ROLE_OPERADOR) {
    const err = new Error("Role inválida");
    err.status = 400;
    throw err;
  }

  const cnpjLimpo = (cnpj || "").replace(/\D/g, "");
  if (!cnpjLimpo) {
    const err = new Error("CNPJ é obrigatório");
    err.status = 400;
    throw err;
  }

  const existing = await findUserByCNPJ(cnpjLimpo);
  if (existing) {
    const err = new Error("Já existe usuário com este CNPJ");
    err.status = 409;
    throw err;
  }

  const senhaInicial = generateInitialPassword();
  const senhaHash = await hashPassword(senhaInicial);

  // 1) cria o usuário inicialmente com admin_id = null
  const userId = await createUser({
    nome,
    cnpj: cnpjLimpo,
    senhaHash,
    role,
    adminId: null,
  });

  // 2) define o adminId correto:
  //    - ADMIN   -> aponta para si mesmo
  //    - OPERADOR -> aponta para o admin criador
  let adminIdForUser = null;

  if (role === ROLE_ADMIN) {
    adminIdForUser = userId;
  } else {
    adminIdForUser = creatorAdminId;
  }

  await updateUserAdminId(userId, adminIdForUser);

  return {
    id: userId,
    nome,
    cnpj: cnpjLimpo,
    role,
    adminId: adminIdForUser,
    senha_inicial: senhaInicial,
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
    cnpj: u.cnpj,
    role: u.role,
    precisaTrocarSenha: !!u.precisaTrocarSenha,
    ativo: !!u.ativo,
    adminId: u.adminId ?? null,
    adminNome: u.adminNome || null,
  };
}

/**
 * Trocar a própria senha
 * - valida senha atual
 * - define senha nova
 * - limpa flag precisa_trocar_senha
 */
async function changeMyPassword(userId, senhaAtual, senhaNova) {
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

  const ok = await comparePassword(senhaAtual, u.senhaHash);
  if (!ok) {
    const err = new Error("Senha atual incorreta");
    err.status = 401;
    throw err;
  }

  const novaHash = await hashPassword(senhaNova);
  await updateUserPassword(userId, novaHash, false);

  return { success: true };
}

/**
 * Atualiza o nome do próprio usuário autenticado
 */
async function changeMyName(userId, novoNome) {
  const nomeLimpo = (novoNome || "").trim();

  if (!nomeLimpo) {
    const err = new Error("Nome não pode ser vazio");
    err.status = 400;
    throw err;
  }

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

  await updateUserName(userId, nomeLimpo);

  // devolve perfil atualizado
  return getMyProfile(userId);
}

/**
 * Lista todos os usuários (para administração)
 */
async function getAllUsersService() {
  const rows = await listAllUsers();
  return rows.map((u) => ({
    id: u.id,
    nome: u.nome,
    cnpj: u.cnpj,
    role: u.role,
    ativo: !!u.ativo,
    adminId: u.adminId ?? null,
    adminNome: u.adminNome || null,
  }));
}

module.exports = {
  adminCreateUser,
  getMyProfile,
  changeMyPassword,
  changeMyName,
  getAllUsersService,
};
