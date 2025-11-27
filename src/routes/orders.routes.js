const express = require("express");
const router = express.Router();

const {
  createOrderHandler,
  updateOrderHandler,
  deleteOrderHandler,
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

// PUT /orders/:id -> atualizar itens da ordem
router.put("/:id", updateOrderHandler);

// DELETE /orders/:id -> excluir ordem
router.delete("/:id", deleteOrderHandler);

// POST /orders/:id/xlsx -> download planilha preenchida
router.post("/:id/xlsx", downloadOrderXlsxHandler);

module.exports = router;
