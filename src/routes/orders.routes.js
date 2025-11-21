const express = require("express");
const router = express.Router();
const {
  createOrderHandler,
  listOrdersHandler,
  getOrderHandler,
  downloadOrderPdfHandler, // NOVO
} = require("../controllers/orderController");

// GET /orders -> lista ordens
router.get("/", listOrdersHandler);

// PDF da ordem
router.get("/:id/pdf", downloadOrderPdfHandler); // NOVO

// GET /orders/:id -> detalhes da ordem
router.get("/:id", getOrderHandler);

// POST /orders -> cria nova ordem
router.post("/", createOrderHandler);

module.exports = router;
