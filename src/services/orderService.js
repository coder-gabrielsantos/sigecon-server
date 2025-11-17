const {
  insertOrder,
  bulkInsertOrderItems,
  findAllOrdersSummary,
  findOrderByIdWithItems,
} = require("../db/queries/orders.queries");

const {
  findContractByIdWithItems,
} = require("../db/queries/contracts.queries");

/**
 * Parser igual ao de contratos para lidar com "1.234,56" etc.
 */
function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  let str = String(value).trim();
  if (!str) return null;

  str = str.replace(/R\$/gi, "").replace(/\s+/g, "");
  str = str.replace(/\./g, "").replace(/,/g, ".");

  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

/**
 * Cria uma ordem a partir de um contrato e itens selecionados.
 *
 * payload:
 * {
 *   contractId,
 *   orderType,
 *   orderNumber?,
 *   issueDate?,
 *   referencePeriod?,
 *   justification?,
 *   items: [{ contractItemId, quantity }]
 * }
 */
async function createOrder(payload = {}) {
  const contractIdNum = Number(payload.contractId);
  if (!contractIdNum || Number.isNaN(contractIdNum)) {
    const err = new Error("ID de contrato inválido.");
    err.status = 400;
    throw err;
  }

  const contract = await findContractByIdWithItems(contractIdNum);
  if (!contract) {
    const err = new Error("Contrato não encontrado.");
    err.status = 404;
    throw err;
  }

  const itemsFromPayload = Array.isArray(payload.items) ? payload.items : [];
  if (!itemsFromPayload.length) {
    const err = new Error("Selecione pelo menos um item para a ordem.");
    err.status = 400;
    throw err;
  }

  const orderType =
    (payload.orderType && String(payload.orderType).trim()) ||
    "ORDEM DE FORNECIMENTO";

  const orderNumber =
    payload.orderNumber !== undefined
      ? String(payload.orderNumber || "").trim() || null
      : null;

  const issueDate = payload.issueDate || null;
  const referencePeriod =
    payload.referencePeriod !== undefined
      ? String(payload.referencePeriod || "").trim() || null
      : null;

  const justification =
    payload.justification !== undefined
      ? String(payload.justification || "").trim() || null
      : null;

  // monta itens com base nos itens do contrato
  const itemsById = new Map(
    (contract.items || []).map((it) => [Number(it.id), it])
  );

  const orderItems = [];
  let totalAmount = 0;

  for (const raw of itemsFromPayload) {
    const contrItemId = Number(raw.contractItemId);
    if (!contrItemId || Number.isNaN(contrItemId)) continue;

    const baseItem = itemsById.get(contrItemId);
    if (!baseItem) continue;

    const q = parseNumber(raw.quantity);
    if (!q || q <= 0) continue;

    const unitPrice = parseNumber(baseItem.unitPrice ?? baseItem.unit_price);
    const totalPrice = (q || 0) * (unitPrice || 0);

    totalAmount += totalPrice;

    orderItems.push({
      contractItemId: contrItemId,
      description: baseItem.description || null,
      unit: baseItem.unit || null,
      quantity: q,
      unitPrice: unitPrice || null,
      totalPrice: totalPrice || null,
    });
  }

  if (!orderItems.length) {
    const err = new Error("Nenhum item válido informado para a ordem.");
    err.status = 400;
    throw err;
  }

  // cria ordem
  const orderId = await insertOrder({
    contractId: contractIdNum,
    orderType,
    orderNumber,
    issueDate,
    referencePeriod,
    justification,
    totalAmount,
  });

  // vincula ID da ordem aos itens e insere
  const itemsToInsert = orderItems.map((it) => ({
    orderId,
    ...it,
  }));

  await bulkInsertOrderItems(itemsToInsert);

  // retorna ordem completa
  const created = await findOrderByIdWithItems(orderId);
  return {
    ...created,
    contract: {
      id: contract.id,
      number: contract.number,
      supplier: contract.supplier,
    },
  };
}

async function listOrders() {
  return findAllOrdersSummary();
}

async function getOrderById(id) {
  const order = await findOrderByIdWithItems(id);
  if (!order) {
    const err = new Error("Ordem não encontrada.");
    err.status = 404;
    throw err;
  }
  return order;
}

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
};
