const express = require("express");
const router = express.Router();

const {
  createOrderHandler,
  listOrdersHandler,
  getOrderHandler,
  downloadOrderXlsxHandler,
} = require("../controllers/orderController");

const { requireAuth } = require("../middleware/auth");

// Todas as rotas de ORDENS exigem usuário autenticado
router.use(requireAuth);

// GET /orders -> lista ordens (apenas do admin dono / operadores vinculados)
router.get("/", listOrdersHandler);

// POST /orders -> cria nova ordem
router.post("/", createOrderHandler);

// GET /orders/:id -> detalhes da ordem
router.get("/:id", getOrderHandler);

// POST /orders/:id/xlsx -> download planilha preenchida
router.post("/:id/xlsx", downloadOrderXlsxHandler);

module.exports = router;
