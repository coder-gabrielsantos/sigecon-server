const {
  adminCreateUser,
  getMyProfile,
  changeMyPassword,
  changeMyName,
  getAllUsersService,
} = require("../services/userService");

/**
 * POST /usuarios
 * BODY: { nome, cnpj, role }
 * Apenas ADMIN pode criar novos usuários
 */
async function createUserController(req, res, next) {
  try {
    const { nome, cnpj, role } = req.body;

    // admin criador sempre vem de req.user
    const creatorAdminId = req.user.id;

    const result = await adminCreateUser({
      nome,
      cnpj,
      role,
      creatorAdminId,
    });

    return res.status(201).json(result);
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
 * BODY: { senhaAtual, senhaNova }
 * Qualquer usuário autenticado
 */
async function changePasswordController(req, res, next) {
  try {
    const myUserId = req.user.id;
    const { senhaAtual, senhaNova } = req.body;

    if (!senhaAtual || !senhaNova) {
      return res
        .status(400)
        .json({ error: "senhaAtual e senhaNova são obrigatórias" });
    }

    await changeMyPassword(myUserId, senhaAtual, senhaNova);

    return res.status(200).json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /usuarios/me/nome
 * Qualquer usuário autenticado
 */
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

/**
 * GET /usuarios
 * Apenas ADMIN
 */
async function listUsersController(req, res, next) {
  try {
    const users = await getAllUsersService();
    return res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createUserController,
  getMeController,
  changePasswordController,
  changeNameController,
  listUsersController,
};
