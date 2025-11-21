const express = require("express");
const router = express.Router();
const {
  createOrderHandler,
  listOrdersHandler,
  getOrderHandler,
  downloadOrderXlsxHandler,
} = require("../controllers/orderController");

// GET /orders -> lista ordens
router.get("/", listOrdersHandler);

// POST /orders -> cria nova ordem
router.post("/", createOrderHandler);

// GET /orders/:id -> detalhes da ordem
router.get("/:id", getOrderHandler);

// GET /orders/:id/xlsx -> download planilha preenchida
router.get("/:id/xlsx", downloadOrderXlsxHandler);

module.exports = router;
