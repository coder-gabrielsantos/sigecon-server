const {
  insertOrder,
  bulkInsertOrderItems,
  findAllOrdersSummary,
  findOrderByIdWithItems,
  findUsedQuantitiesByContractId,
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
    // Formato tipo "1.234,56" → remove pontos (milhar) e troca vírgula por ponto
    str = str.replace(/\./g, "").replace(/,/g, ".");
  } else if (hasComma) {
    // Formato tipo "1234,56" → vírgula é decimal
    str = str.replace(/,/g, ".");
  } else {
    // Só dígitos e (talvez) ponto → assume que o ponto já é decimal ("2737.96")
    // NÃO remove os pontos aqui
  }

  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

/**
 * Enriquecer itens da ordem com o itemNo do item do contrato.
 *
 * - Usa order.contractId para buscar o contrato (caso não seja passado).
 * - Para cada item da ordem, se não tiver itemNo, usa o itemNo/item_no
 *   do item do contrato com o mesmo contractItemId.
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
    // se já veio itemNo do banco, mantém
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

  // ------------------------------------------------------
  // 1) Mapa de itens do contrato
  // ------------------------------------------------------
  const itemsById = new Map(
    (contract.items || []).map((it) => [Number(it.id), it])
  );

  // ------------------------------------------------------
  // 2) Quantidade já consumida por item deste contrato
  // ------------------------------------------------------
  const usedRows = await findUsedQuantitiesByContractId(contractIdNum);
  const usedMap = new Map(
    usedRows.map((r) => [
      Number(r.contractItemId),
      parseNumber(r.totalUsed) || 0,
    ])
  );

  // ------------------------------------------------------
  // 3) Montar itens da ordem com validação de quantidade
  // ------------------------------------------------------
  const orderItems = [];
  let totalAmount = 0;

  for (const raw of itemsFromPayload) {
    const contrItemId = Number(raw.contractItemId);
    if (!contrItemId || Number.isNaN(contrItemId)) continue;

    const baseItem = itemsById.get(contrItemId);
    if (!baseItem) continue;

    const q = parseNumber(raw.quantity);
    if (!q || q <= 0) continue;

    // quantidade definida no contrato para este item
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

  // ------------------------------------------------------
  // 4) Criar ordem e salvar itens
  // ------------------------------------------------------
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

  let created = await findOrderByIdWithItems(orderId);
  // garante itemNo também logo após criar
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

async function listOrders() {
  // já retorna totalAmount + totalItems + dados de contrato
  return findAllOrdersSummary();
}

async function getOrderById(id) {
  let order = await findOrderByIdWithItems(id);
  if (!order) {
    const err = new Error("Ordem não encontrada.");
    err.status = 404;
    throw err;
  }

  // preenche itemNo para cada item, se possível
  order = await enrichOrderItemsWithItemNo(order);

  return order;
}

async function getOrderWithContract(id) {
  const orderId = Number(id);
  if (!orderId || Number.isNaN(orderId)) {
    const err = new Error("ID de ordem inválido.");
    err.status = 400;
    throw err;
  }

  let order = await findOrderByIdWithItems(orderId);
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

  const contract = await findContractByIdWithItems(order.contractId);
  if (!contract) {
    const err = new Error("Contrato vinculado à ordem não foi encontrado.");
    err.status = 404;
    throw err;
  }

  // reaproveita o contrato já carregado pra preencher os itemNo
  order = await enrichOrderItemsWithItemNo(order, contract);

  return { order, contract };
}

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  getOrderWithContract,
};
