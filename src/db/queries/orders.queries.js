const db = require("../../config/db");

/**
 * Insere uma ordem e retorna o ID.
 */
async function insertOrder({
                             contractId,
                             orderType,
                             orderNumber,
                             issueDate,
                             referencePeriod,
                             justification,
                             totalAmount,
                           }) {
  const [result] = await db.query(
    `
        INSERT INTO orders
            (contract_id, order_type, order_number, issue_date, reference_period, justification, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      contractId,
      orderType,
      orderNumber || null,
      issueDate || null,
      referencePeriod || null,
      justification || null,
      totalAmount || 0,
    ]
  );

  return result.insertId;
}

/**
 * Insere vários itens de ordem de uma vez.
 * items: [{ orderId, contractItemId, description, unit, quantity, unitPrice, totalPrice }]
 */
async function bulkInsertOrderItems(items) {
  if (!items || !items.length) return;

  const values = items.map((it) => [
    it.orderId,
    it.contractItemId,
    it.description ?? null,
    it.unit ?? null,
    it.quantity ?? null,
    it.unitPrice ?? null,
    it.totalPrice ?? null,
  ]);

  await db.query(
    `
        INSERT INTO order_items
            (order_id, contract_item_id, description, unit, quantity, unit_price, total_price)
        VALUES ?
    `,
    [values]
  );
}

/**
 * Lista ordens com um resumo + dados do contrato.
 * Agora inclui também totalItems (soma das quantidades da ordem).
 *
 * Se adminId for informado, filtra pelas ordens cujos contratos pertencem
 * a esse admin.
 */
async function findAllOrdersSummary(adminId) {
  const params = [];
  let whereClause = "";

  if (adminId) {
    whereClause = "WHERE c.admin_id = ?";
    params.push(adminId);
  }

  const [rows] = await db.query(
    `
        SELECT 
            o.id,
            o.order_number                 AS orderNumber,
            o.order_type                   AS orderType,
            o.issue_date                   AS issueDate,
            o.total_amount                 AS totalAmount,
            COALESCE(oi_tot.totalItems, 0) AS totalItems,
            c.id                           AS contractId,
            c.number                       AS contractNumber,
            c.supplier                     AS supplier
        FROM orders o
        JOIN contracts c ON c.id = o.contract_id
        LEFT JOIN (
            SELECT 
                order_id,
                SUM(quantity) AS totalItems
            FROM order_items
            GROUP BY order_id
        ) oi_tot ON oi_tot.order_id = o.id
        ${whereClause}
        ORDER BY o.created_at DESC, o.id DESC
    `,
    params
  );

  return rows;
}

/**
 * Busca uma ordem + itens.
 * Agora aceita adminId: se informado, só retorna se a ordem pertencer
 * a um contrato cujo admin_id = adminId.
 */
async function findOrderByIdWithItems(id, adminId) {
  const params = [id];
  let adminFilter = "";

  if (adminId) {
    adminFilter = "AND c.admin_id = ?";
    params.push(adminId);
  }

  const [orders] = await db.query(
    `
        SELECT
            o.id,
            o.contract_id      AS contractId,
            o.order_type       AS orderType,
            o.order_number     AS orderNumber,
            o.issue_date       AS issueDate,
            o.reference_period AS referencePeriod,
            o.justification    AS justification,
            o.total_amount     AS totalAmount,
            o.created_at       AS createdAt
        FROM orders o
                 JOIN contracts c ON c.id = o.contract_id
        WHERE o.id = ?
            ${adminFilter}
    `,
    params
  );

  if (!orders.length) {
    return null;
  }

  const order = orders[0];

  const [items] = await db.query(
    `
        SELECT 
            oi.id,
            oi.contract_item_id AS contractItemId,
            oi.description      AS description,
            oi.unit             AS unit,
            oi.quantity         AS quantity,
            oi.unit_price       AS unitPrice,
            oi.total_price      AS totalPrice
        FROM order_items oi
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
    `,
    [order.id]
  );

  // calcula totalItems (soma das quantidades)
  const totalItems = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );

  return {
    ...order,
    items,
    totalItems,
  };
}

/**
 * Para cada item de contrato, calcula quanto já foi usado em ordens.
 * Retorna linhas: { contractItemId, totalUsed }
 */
async function findUsedQuantitiesByContractId(contractId) {
  const [rows] = await db.query(
    `
        SELECT
            oi.contract_item_id AS contractItemId,
            SUM(oi.quantity)    AS totalUsed
        FROM order_items oi
                 JOIN orders o ON o.id = oi.order_id
        WHERE o.contract_id = ?
        GROUP BY oi.contract_item_id
    `,
    [contractId]
  );

  return rows;
}

module.exports = {
  insertOrder,
  bulkInsertOrderItems,
  findAllOrdersSummary,
  findOrderByIdWithItems,
  findUsedQuantitiesByContractId,
};
