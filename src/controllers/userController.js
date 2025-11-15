const {
  adminCreateUser,
  getMyProfile,
  changeMyPassword,
  changeMyName
} = require("../services/userService");

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
    const myUserId = req.user.id;
    const me = await getMyProfile(myUserId);
    return res.status(200).json(me);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /usuarios/me/senha
 * BODY: { senha_atual, senha_nova }
 * Qualquer usuário autenticado
 */
async function changePasswordController(req, res, next) {
  try {
    console.log(req.body)
    const myUserId = req.user.id;
    const { senhaAtual, senhaNova } = req.body;

    if (!senhaAtual || !senhaNova) {
      return res.status(400).json({ error: "senha_atual e senha_nova são obrigatórias" });
    }

    await changeMyPassword(myUserId, senhaAtual, senhaNova);

    return res.status(200).json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    next(err);
  }
}

async function changeNameController(req, res, next) {
  try {
    const userId = req.user.id;
    const { nome } = req.body;
    const updatedProfile = await changeMyName(userId, nome);
    return res.json(updatedProfile);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createUserController,
  getMeController,
  changePasswordController,
  changeNameController
};
