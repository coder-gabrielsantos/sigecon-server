const {
  createOrder,
  listOrders,
  getOrderById,
} = require("../services/orderService");

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

module.exports = {
  createOrderHandler,
  listOrdersHandler,
  getOrderHandler,
};
