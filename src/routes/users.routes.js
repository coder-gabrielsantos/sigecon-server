const express = require("express");
const router = express.Router();

const { createUserController, getMeController } = require("../controllers/userController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { ROLE_ADMIN } = require("../utils/roleConstants");

// ADMIN cria novo usuário
router.post(
  "/",
  requireAuth,
  requireRole(ROLE_ADMIN), // só ADMIN pode cadastrar outras pessoas
  createUserController
);

// qualquer usuário autenticado pega seus próprios dados
router.get(
  "/me",
  requireAuth,
  getMeController
);

module.exports = router;
