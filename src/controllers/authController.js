const { loginWithCPFAndPassword } = require("../services/authService");

/**
 * POST /auth/login
 * body: { cpf, senha }
 */
async function login(req, res, next) {
  try {
    const { cpf, senha } = req.body;

    if (!cpf || !senha) {
      return res.status(400).json({ error: "CPF e senha são obrigatórios" });
    }

    const result = await loginWithCPFAndPassword(cpf, senha);

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login
};
