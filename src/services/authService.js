const { findUserByCNPJ } = require("../db/queries/users.queries");
const { comparePassword } = require("../utils/hashPassword");
const generateToken = require("../utils/generateToken");

async function loginWithCNPJAndPassword(cnpj, senha) {
  const user = await findUserByCNPJ(cnpj);

  if (!user) {
    const err = new Error("CNPJ ou senha inválidos");
    err.status = 401;
    throw err;
  }

  const ok = await comparePassword(senha, user.senhaHash);
  if (!ok) {
    const err = new Error("CNPJ ou senha inválidos");
    err.status = 401;
    throw err;
  }

  const token = generateToken({
    id: user.id,
    role: user.role,
    adminId: user.adminId ?? null,
  });

  return {
    token,
    user: {
      id: user.id,
      nome: user.nome,
      role: user.role,
      adminId: user.adminId ?? null,
    },
  };
}

module.exports = {
  loginWithCNPJAndPassword,
};
