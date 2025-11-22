const {
  createOrder,
  listOrders,
  getOrderById,
  getOrderWithContract,
} = require("../services/orderService");
const { generateOrderWorkbook } = require("../utils/orderGenerator");

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
async function downloadOrderXlsxHandler(req, res, next) {
  try {
    const { id } = req.params;

    // só pra conferir se está vindo mesmo
    console.log("BODY XLSX >>>", req.body);

    // 1) ordem + contrato + itens
    const { order, contract } = await getOrderWithContract(id);

    // 2) extras vindos do form
    const extras = req.body || {};

    // 3) gera workbook com extras
    const workbook = await generateOrderWorkbook({
      order,
      contract,
      extras,
    });

    const safeNumber = order.orderNumber || order.id || `ordem_${id}`;
    const filename = `ordem_${safeNumber}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrderHandler,
  listOrdersHandler,
  getOrderHandler,
  downloadOrderXlsxHandler,
};
