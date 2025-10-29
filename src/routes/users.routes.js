const express = require("express");
const router = express.Router();

const {
  createUserController,
  getMeController,
  changePasswordController
} = require("../controllers/userController");

const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { ROLE_ADMIN } = require("../utils/roleConstants");

// ADMIN cria novo usuário (ADMIN ou OPERADOR)
router.post(
  "/",
  requireAuth,
  requireRole(ROLE_ADMIN),
  createUserController
);

// pega perfil do próprio usuário autenticado
router.get(
  "/me",
  requireAuth,
  getMeController
);

// usuário autenticado troca a própria senha
router.put(
  "/me/senha",
  requireAuth,
  changePasswordController
);

module.exports = router;
