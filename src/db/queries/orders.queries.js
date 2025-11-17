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
 */
async function findAllOrdersSummary() {
  const [rows] = await db.query(
    `
        SELECT
            o.id,
            o.order_number   AS orderNumber,
            o.order_type     AS orderType,
            o.issue_date     AS issueDate,
            o.total_amount   AS totalAmount,
            c.id             AS contractId,
            c.number         AS contractNumber,
            c.supplier       AS supplier
        FROM orders o
                 JOIN contracts c ON c.id = o.contract_id
        ORDER BY o.created_at DESC, o.id DESC
    `
  );

  return rows;
}

/**
 * Busca uma ordem + itens.
 */
async function findOrderByIdWithItems(id) {
  const [orders] = await db.query(
    `
        SELECT
            o.id,
            o.contract_id    AS contractId,
            o.order_type     AS orderType,
            o.order_number   AS orderNumber,
            o.issue_date     AS issueDate,
            o.reference_period AS referencePeriod,
            o.justification  AS justification,
            o.total_amount   AS totalAmount,
            o.created_at     AS createdAt
        FROM orders o
        WHERE o.id = ?
            LIMIT 1
    `,
    [id]
  );

  const order = orders[0];
  if (!order) return null;

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
    [id]
  );

  order.items = items;
  return order;
}

module.exports = {
  insertOrder,
  bulkInsertOrderItems,
  findAllOrdersSummary,
  findOrderByIdWithItems,
};
