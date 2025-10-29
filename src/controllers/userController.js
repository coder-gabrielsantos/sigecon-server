const { adminCreateUser, getMyProfile } = require("../services/userService");

/**
 * POST /usuarios
 * BODY: { nome, cpf, role }
 * Apenas ADMIN
 */
async function createUserController(req, res, next) {
  try {
    const { nome, cpf, role } = req.body;

    if (!nome || !cpf || !role) {
      return res.status(400).json({ error: "nome, cpf e role são obrigatórios" });
    }

    const novoUsuario = await adminCreateUser({ nome, cpf, role });

    // Atenção: aqui retornamos a senha inicial para o ADMIN passar ao funcionário.
    return res.status(201).json(novoUsuario);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /usuarios/me
 * Qualquer usuário autenticado
 */
async function getMeController(req, res, next) {
  try {
    const myUserId = req.user.id; // vem do requireAuth
    const me = await getMyProfile(myUserId);
    return res.status(200).json(me);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createUserController,
  getMeController
};
