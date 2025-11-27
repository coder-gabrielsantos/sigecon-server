const {
  insertOrder,
  bulkInsertOrderItems,
  findAllOrdersSummary,
  findOrderByIdWithItems,
  findUsedQuantitiesByContractId,
  updateOrderItemQuantity,
  updateOrderTotalAmount,
  deleteOrderById,
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

  // remove símbolo de moeda e espaços
  str = str.replace(/R\$/gi, "").replace(/\s+/g, "");

  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  if (hasComma && hasDot) {
    // "1.234,56"
    str = str.replace(/\./g, "").replace(/,/g, ".");
  } else if (hasComma) {
    // "1234,56"
    str = str.replace(/,/g, ".");
  }

  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

/**
 * Usa o contrato para preencher itemNo nos itens da ordem.
 */
async function enrichOrderItemsWithItemNo(order, existingContract) {
  if (
    !order ||
    !order.contractId ||
    !Array.isArray(order.items) ||
    order.items.length === 0
  ) {
    return order;
  }

  // se já recebemos o contrato, reaproveita
  let contract = existingContract;
  if (!contract) {
    contract = await findContractByIdWithItems(order.contractId);
  }
  if (!contract || !Array.isArray(contract.items)) {
    return order;
  }

  const contractItemsById = new Map(
    contract.items.map((ci) => [Number(ci.id), ci])
  );

  const newItems = order.items.map((item) => {
    // se já veio itemNo, mantém
    if (item.itemNo !== undefined && item.itemNo !== null) {
      return item;
    }

    const contractItemId = item.contractItemId || item.contract_item_id;
    const base =
      contractItemId != null
        ? contractItemsById.get(Number(contractItemId))
        : null;

    const itemNo =
      base && (base.itemNo !== undefined || base.item_no !== undefined)
        ? base.itemNo ?? base.item_no
        : null;

    return {
      ...item,
      itemNo,
    };
  });

  return {
    ...order,
    items: newItems,
  };
}

/**
 * Cria uma ordem a partir de um contrato e itens selecionados.
 */
async function createOrder(payload = {}, ownerAdminId) {
  if (!ownerAdminId) {
    const err = new Error("Usuário não vinculado a um administrador.");
    err.status = 403;
    throw err;
  }

  const contractIdNum = Number(payload.contractId);
  if (!contractIdNum || Number.isNaN(contractIdNum)) {
    const err = new Error("ID de contrato inválido.");
    err.status = 400;
    throw err;
  }

  // Garante que o contrato pertence a esse admin
  const contract = await findContractByIdWithItems(contractIdNum, ownerAdminId);
  if (!contract) {
    const err = new Error(
      "Contrato não encontrado ou não pertence ao seu administrador."
    );
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

  // Mapa de itens do contrato
  const itemsById = new Map(
    (contract.items || []).map((it) => [Number(it.id), it])
  );

  // Quantidade já consumida por item do contrato
  const usedRows = await findUsedQuantitiesByContractId(contractIdNum);
  const usedMap = new Map(
    usedRows.map((r) => [
      Number(r.contractItemId),
      parseNumber(r.totalUsed) || 0,
    ])
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

    const contractQuantity = parseNumber(baseItem.quantity);
    if (contractQuantity === null || contractQuantity === undefined) {
      const err = new Error(
        `Item do contrato (ID ${contrItemId}) não possui quantidade definida.`
      );
      err.status = 400;
      throw err;
    }

    const alreadyUsed = usedMap.get(contrItemId) || 0;
    const available = contractQuantity - alreadyUsed;

    if (available <= 0) {
      const err = new Error(
        `Item do contrato (ID ${contrItemId}) já está totalmente consumido. Quantidade disponível: 0.`
      );
      err.status = 400;
      throw err;
    }

    if (q > available) {
      const err = new Error(
        `Quantidade solicitada (${q}) excede o disponível (${available}) para o item do contrato (ID ${contrItemId}).`
      );
      err.status = 400;
      throw err;
    }

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

  const orderId = await insertOrder({
    contractId: contractIdNum,
    orderType,
    orderNumber,
    issueDate,
    referencePeriod,
    justification,
    totalAmount,
  });

  const itemsToInsert = orderItems.map((it) => ({
    orderId,
    ...it,
  }));
  await bulkInsertOrderItems(itemsToInsert);

  let created = await findOrderByIdWithItems(orderId, ownerAdminId);
  created = await enrichOrderItemsWithItemNo(created, contract);

  return {
    ...created,
    contract: {
      id: contract.id,
      number: contract.number,
      supplier: contract.supplier,
    },
  };
}

/**
 * Atualiza quantidades dos itens da ordem, respeitando limites do contrato.
 * payload: { items: [{ orderItemId, quantity }] }
 */
async function updateOrder(orderId, payload = {}, ownerAdminId) {
  if (!ownerAdminId) {
    const err = new Error("Usuário não vinculado a um administrador.");
    err.status = 403;
    throw err;
  }

  const idNum = Number(orderId);
  if (!idNum || Number.isNaN(idNum)) {
    const err = new Error("ID de ordem inválido.");
    err.status = 400;
    throw err;
  }

  const order = await findOrderByIdWithItems(idNum, ownerAdminId);
  if (!order) {
    const err = new Error("Ordem não encontrada.");
    err.status = 404;
    throw err;
  }

  if (!order.contractId) {
    const err = new Error("Ordem não possui contrato vinculado.");
    err.status = 400;
    throw err;
  }

  const contract = await findContractByIdWithItems(
    order.contractId,
    ownerAdminId
  );
  if (!contract) {
    const err = new Error(
      "Contrato vinculado à ordem não foi encontrado ou não pertence ao seu administrador."
    );
    err.status = 404;
    throw err;
  }

  const itemsPayload = Array.isArray(payload.items) ? payload.items : [];
  if (!itemsPayload.length) {
    const err = new Error(
      "Informe ao menos um item com quantidade para atualizar."
    );
    err.status = 400;
    throw err;
  }

  const orderItemsById = new Map(
    (order.items || []).map((it) => [Number(it.id), it])
  );
  const contractItemsById = new Map(
    (contract.items || []).map((ci) => [Number(ci.id), ci])
  );

  // quanto já foi usado (todas as ordens) por item do contrato
  const usedRows = await findUsedQuantitiesByContractId(order.contractId);
  const usedMap = new Map(
    usedRows.map((r) => [
      Number(r.contractItemId),
      parseNumber(r.totalUsed) || 0,
    ])
  );

  // valida cada item e prepara updates
  for (const raw of itemsPayload) {
    const orderItemId = Number(raw.orderItemId);
    if (!orderItemId || Number.isNaN(orderItemId)) {
      const err = new Error("ID de item da ordem inválido.");
      err.status = 400;
      throw err;
    }

    const baseOrderItem = orderItemsById.get(orderItemId);
    if (!baseOrderItem) {
      const err = new Error(
        `Item da ordem (ID ${orderItemId}) não pertence a esta ordem.`
      );
      err.status = 400;
      throw err;
    }

    const newQty = parseNumber(raw.quantity);
    if (!newQty || newQty <= 0) {
      const err = new Error(
        `Quantidade inválida para o item da ordem (ID ${orderItemId}).`
      );
      err.status = 400;
      throw err;
    }

    const contractItemId = Number(baseOrderItem.contractItemId);
    if (!contractItemId || Number.isNaN(contractItemId)) {
      const err = new Error(
        `Item da ordem (ID ${orderItemId}) não está vinculado corretamente a um item de contrato.`
      );
      err.status = 500;
      throw err;
    }

    const contractItem = contractItemsById.get(contractItemId);
    if (!contractItem) {
      const err = new Error(
        `Item de contrato (ID ${contractItemId}) não encontrado para validação.`
      );
      err.status = 500;
      throw err;
    }

    const contractQuantity = parseNumber(contractItem.quantity);
    if (contractQuantity === null || contractQuantity === undefined) {
      const err = new Error(
        `Item de contrato (ID ${contractItemId}) não possui quantidade definida.`
      );
      err.status = 400;
      throw err;
    }

    const totalUsedAll = usedMap.get(contractItemId) || 0;
    const currentOrderQty = parseNumber(baseOrderItem.quantity) || 0;
    const usedExcludingThis = totalUsedAll - currentOrderQty;
    const newTotalUsed = usedExcludingThis + newQty;

    if (newTotalUsed > contractQuantity) {
      const available = contractQuantity - usedExcludingThis;
      const err = new Error(
        `Quantidade (${newQty}) excede o disponível (${available}) para o item do contrato (ID ${contractItemId}).`
      );
      err.status = 400;
      throw err;
    }

    const unitPrice = parseNumber(
      baseOrderItem.unitPrice ??
      baseOrderItem.unit_price ??
      contractItem.unitPrice ??
      contractItem.unit_price
    );
    const totalPrice = (newQty || 0) * (unitPrice || 0);

    await updateOrderItemQuantity(orderItemId, newQty, totalPrice);
  }

  // recalcula total da ordem com base em todos os itens
  const updated = await findOrderByIdWithItems(idNum, ownerAdminId);
  let totalAmount = 0;
  for (const it of updated.items || []) {
    const q = parseNumber(it.quantity);
    const up = parseNumber(it.unitPrice ?? it.unit_price);
    if (!q || q <= 0 || !up) continue;
    totalAmount += q * up;
  }
  await updateOrderTotalAmount(idNum, totalAmount);

  let finalOrder = await findOrderByIdWithItems(idNum, ownerAdminId);
  finalOrder = await enrichOrderItemsWithItemNo(finalOrder, contract);

  return finalOrder;
}

/**
 * Exclui uma ordem (do admin dono).
 */
async function deleteOrder(orderId, ownerAdminId) {
  if (!ownerAdminId) {
    const err = new Error("Usuário não vinculado a um administrador.");
    err.status = 403;
    throw err;
  }

  const idNum = Number(orderId);
  if (!idNum || Number.isNaN(idNum)) {
    const err = new Error("ID de ordem inválido.");
    err.status = 400;
    throw err;
  }

  const existing = await findOrderByIdWithItems(idNum, ownerAdminId);
  if (!existing) {
    const err = new Error("Ordem não encontrada.");
    err.status = 404;
    throw err;
  }

  await deleteOrderById(idNum);
}

/**
 * Lista ordens visíveis para o admin/operador (filtradas pelo admin dono).
 */
async function listOrders(ownerAdminId) {
  if (!ownerAdminId) {
    const err = new Error("Usuário não vinculado a um administrador.");
    err.status = 403;
    throw err;
  }

  return findAllOrdersSummary(ownerAdminId);
}

/**
 * Busca ordem por ID, garantindo que pertence ao admin/operador.
 */
async function getOrderById(id, ownerAdminId) {
  if (!ownerAdminId) {
    const err = new Error("Usuário não vinculado a um administrador.");
    err.status = 403;
    throw err;
  }

  let order = await findOrderByIdWithItems(id, ownerAdminId);
  if (!order) {
    const err = new Error("Ordem não encontrada.");
    err.status = 404;
    throw err;
  }

  order = await enrichOrderItemsWithItemNo(order);
  return order;
}

/**
 * Busca ordem + contrato, garantindo que pertence ao admin/operador.
 */
async function getOrderWithContract(id, ownerAdminId) {
  if (!ownerAdminId) {
    const err = new Error("Usuário não vinculado a um administrador.");
    err.status = 403;
    throw err;
  }

  const orderId = Number(id);
  if (!orderId || Number.isNaN(orderId)) {
    const err = new Error("ID de ordem inválido.");
    err.status = 400;
    throw err;
  }

  let order = await findOrderByIdWithItems(orderId, ownerAdminId);
  if (!order) {
    const err = new Error("Ordem não encontrada.");
    err.status = 404;
    throw err;
  }

  if (!order.contractId) {
    const err = new Error("Ordem não possui contrato vinculado.");
    err.status = 400;
    throw err;
  }

  const contract = await findContractByIdWithItems(order.contractId, ownerAdminId);
  if (!contract) {
    const err = new Error(
      "Contrato vinculado à ordem não foi encontrado ou não pertence ao seu administrador."
    );
    err.status = 404;
    throw err;
  }

  order = await enrichOrderItemsWithItemNo(order, contract);

  return { order, contract };
}

module.exports = {
  createOrder,
  updateOrder,
  deleteOrder,
  listOrders,
  getOrderById,
  getOrderWithContract,
};
