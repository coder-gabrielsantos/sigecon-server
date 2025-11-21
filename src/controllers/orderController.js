const {
  createOrder,
  listOrders,
  getOrderById,
  getOrderWithContractForPdf,
} = require("../services/orderService");
const { createOrderPdf } = require("../pdf/orderPdfGenerator");

async function createOrderHandler(req, res, next) {
  try {
    const order = await createOrder(req.body || {});
    return res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function listOrdersHandler(req, res, next) {
  try {
    const orders = await listOrders();
    return res.json(orders);
  } catch (err) {
    next(err);
  }
}

async function getOrderHandler(req, res, next) {
  try {
    const { id } = req.params;
    const order = await getOrderById(id);
    return res.json(order);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /orders/:id/pdf
 * - Busca dados da ordem + contrato
 * - Gera o PDF usando o gerador separado
 * - Faz o streaming do PDF para o cliente
 */
async function downloadOrderPdfHandler(req, res, next) {
  try {
    const { id } = req.params;

    const { order, contract } = await getOrderWithContractForPdf(id);

    const doc = createOrderPdf({ order, contract });

    const safeOrderNumber = order.orderNumber || order.id || "ordem";
    const fileName = `ordem-${safeOrderNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    doc.pipe(res);
    doc.end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrderHandler,
  listOrdersHandler,
  getOrderHandler,
  downloadOrderPdfHandler,
};
