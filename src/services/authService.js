const { findUserByCPF } = require("../db/queries/users.queries");
const { comparePassword } = require("../utils/hashPassword");
const generateToken = require("../utils/generateToken");

/**
 * Faz login via CPF e senha.
 * 1. busca usuário por CPF
 * 2. compara senha
 * 3. gera token com id e role
 */
async function loginWithCPFAndPassword(cpf, senha) {
  const user = await findUserByCPF(cpf);

  if (!user) {
    const err = new Error("CPF ou senha inválidos");
    err.status = 401;
    throw err;
  }

  const ok = await comparePassword(senha, user.senhaHash);
  if (!ok) {
    const err = new Error("CPF ou senha inválidos");
    err.status = 401;
    throw err;
  }

  const token = generateToken({
    id: user.id,
    role: user.role
  });

  // o que vamos devolver pro frontend após login
  return {
    token,
    user: {
      id: user.id,
      nome: user.nome,
      role: user.role
    }
  };
}

module.exports = {
  loginWithCPFAndPassword
};
