const {
  createOrder,
  updateOrder,
  deleteOrder,
  listOrders,
  getOrderById,
  getOrderWithContract,
} = require("../services/orderService");
const { generateOrderWorkbook } = require("../utils/orderGenerator");

/**
 * Descobre qual é o "admin dono" considerando o usuário autenticado:
 * - Se for ADMIN → usa o próprio id
 * - Se for OPERADOR → usa adminId (campo salvo no token)
 */
function getOwnerAdminId(req) {
  const { id, role, adminId } = req.user || {};

  if (!id || !role) {
    const err = new Error("Usuário não autenticado");
    err.status = 401;
    throw err;
  }

  if (role === "ADMIN") {
    return id;
  }

  if (role === "OPERADOR" && adminId) {
    return adminId;
  }

  const err = new Error("Usuário não está vinculado a um administrador");
  err.status = 403;
  throw err;
}

/**
 * POST /orders
 */
async function createOrderHandler(req, res, next) {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const order = await createOrder(req.body || {}, ownerAdminId);
    return res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /orders/:id
 * Atualiza quantidades dos itens da ordem.
 */
async function updateOrderHandler(req, res, next) {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const { id } = req.params;
    const order = await updateOrder(id, req.body || {}, ownerAdminId);
    return res.json(order);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /orders/:id
 */
async function deleteOrderHandler(req, res, next) {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const { id } = req.params;
    await deleteOrder(id, ownerAdminId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * GET /orders
 */
async function listOrdersHandler(req, res, next) {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const orders = await listOrders(ownerAdminId);
    return res.json(orders);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /orders/:id
 */
async function getOrderHandler(req, res, next) {
  try {
    const { id } = req.params;
    const ownerAdminId = getOwnerAdminId(req);
    const order = await getOrderById(id, ownerAdminId);
    return res.json(order);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /orders/:id/xlsx
 */
async function downloadOrderXlsxHandler(req, res, next) {
  try {
    const { id } = req.params;
    const ownerAdminId = getOwnerAdminId(req);

    const { order, contract } = await getOrderWithContract(id, ownerAdminId);
    const extras = req.body || {};

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
  updateOrderHandler,
  deleteOrderHandler,
  listOrdersHandler,
  getOrderHandler,
  downloadOrderXlsxHandler,
};
