const express = require("express");
const router = express.Router();
const {
  createOrderHandler,
  listOrdersHandler,
  getOrderHandler,
} = require("../controllers/orderController");

// GET /orders -> lista ordens
router.get("/", listOrdersHandler);

// POST /orders -> cria nova ordem
router.post("/", createOrderHandler);

// GET /orders/:id -> detalhes da ordem
router.get("/:id", getOrderHandler);

module.exports = router;
