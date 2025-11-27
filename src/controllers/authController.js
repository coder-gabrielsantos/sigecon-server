const { loginWithCNPJAndPassword } = require("../services/authService");

/**
 * POST /auth/login
 * body: { cnpj, senha }
 */
async function login(req, res, next) {
  try {
    const { cnpj, senha } = req.body;

    if (!cnpj || !senha) {
      return res.status(400).json({ error: "CNPJ e senha são obrigatórios" });
    }

    const result = await loginWithCNPJAndPassword(cnpj, senha);

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
};
