const db = require("../../config/db");

/**
 * Cria um contrato na tabela 'contracts'.
 * Agora sem o campo total_amount e com vínculo ao admin (admin_id).
 */
async function createContract({
                                number,
                                supplier,
                                pdfPath,
                                startDate = null,
                                endDate = null,
                                adminId = null,
                              }) {
  const [result] = await db.query(
    `
        INSERT INTO contracts
            (number, supplier, pdf_path, start_date, end_date, admin_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `,
    [number, supplier, pdfPath, startDate, endDate, adminId]
  );

  return result.insertId;
}

/**
 * Insere itens do contrato na tabela `contract_items`.
 * items: [{ contractId, itemNo, description, unit, quantity, unitPrice, totalPrice }]
 */
async function bulkInsertContractItems(items) {
  if (!items || !items.length) return;

  const values = items.map((it) => [
    it.contractId,
    it.itemNo ?? null,
    it.description ?? null,
    it.unit ?? null,
    it.quantity ?? null,
    it.unitPrice ?? null,
    it.totalPrice ?? null,
  ]);

  await db.query(
    `
        INSERT INTO contract_items
            (contract_id, item_no, description, unit, quantity, unit_price, total_price)
        VALUES ?
    `,
    [values]
  );
}

/**
 * Insere um único item na tabela `contract_items`.
 */
async function insertContractItem({
                                    contractId,
                                    itemNo,
                                    description,
                                    unit,
                                    quantity,
                                    unitPrice,
                                    totalPrice,
                                  }) {
  const [result] = await db.query(
    `
        INSERT INTO contract_items
            (contract_id, item_no, description, unit, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      contractId,
      itemNo ?? null,
      description ?? null,
      unit ?? null,
      quantity ?? null,
      unitPrice ?? null,
      totalPrice ?? null,
    ]
  );

  return result.insertId;
}

/**
 * Encontra item pelo par (contract_id, item_no).
 * Agora traz também quantidade, unit_price e total_price.
 */
async function findContractItemByContractAndItemNo(contractId, itemNo) {
  const [rows] = await db.query(
    `
        SELECT id,
               contract_id AS contractId,
               item_no     AS itemNo,
               quantity    AS quantity,
               unit_price  AS unitPrice,
               total_price AS totalPrice
        FROM contract_items
        WHERE contract_id = ?
          AND item_no = ? LIMIT 1
    `,
    [contractId, itemNo]
  );

  return rows[0] || null;
}

/**
 * Calcula o próximo item_no sequencial para um contrato.
 */
async function getNextItemNoForContract(contractId) {
  const [rows] = await db.query(
    `
        SELECT COALESCE(MAX(item_no), 0) + 1 AS nextItemNo
        FROM contract_items
        WHERE contract_id = ?
    `,
    [contractId]
  );

  return (rows[0] && rows[0].nextItemNo) || 1;
}

/**
 * Atualiza um item específico de contract_items por ID.
 * Aceita objeto parcial: { itemNo?, description?, unit?, quantity?, unitPrice?, totalPrice? }
 */
async function updateContractItemById(id, data) {
  const fields = [];
  const values = [];

  if (data.itemNo !== undefined) {
    fields.push("item_no = ?");
    values.push(data.itemNo);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.unit !== undefined) {
    fields.push("unit = ?");
    values.push(data.unit);
  }
  if (data.quantity !== undefined) {
    fields.push("quantity = ?");
    values.push(data.quantity);
  }
  if (data.unitPrice !== undefined) {
    fields.push("unit_price = ?");
    values.push(data.unitPrice);
  }
  if (data.totalPrice !== undefined) {
    fields.push("total_price = ?");
    values.push(data.totalPrice);
  }

  if (!fields.length) return;

  values.push(id);

  await db.query(
    `
        UPDATE contract_items
        SET ${fields.join(", ")}
        WHERE id = ?
    `,
    values
  );
}

/**
 * Remove um item de contract_items por ID.
 */
async function deleteContractItemById(id) {
  await db.query(
    `
        DELETE
        FROM contract_items
        WHERE id = ?
    `,
    [id]
  );
}

/**
 * Lista contratos com resumo para a tela principal.
 * Agora filtrando por admin (admin_id).
 */
async function findAllContractsSummary(adminId) {
  const params = [];
  let whereClause = "";

  if (adminId != null) {
    whereClause = "WHERE c.admin_id = ?";
    params.push(adminId);
  }

  const [rows] = await db.query(
    `
        SELECT c.id,
               c.number                                                        AS number,
               c.supplier                                                      AS supplier,
               COALESCE(ci_tot.totalAmount, 0)                                 AS totalAmount,
               COALESCE(o_tot.usedAmount, 0)                                   AS usedAmount,
               COALESCE(ci_tot.totalAmount, 0) - COALESCE(o_tot.usedAmount, 0) AS remainingAmount
        FROM contracts c
                 LEFT JOIN (
                     SELECT contract_id,
                            SUM(total_price) AS totalAmount
                     FROM contract_items
                     WHERE item_no IS NOT NULL -- ignora linha de TOTAL e afins
                     GROUP BY contract_id
                 ) ci_tot ON ci_tot.contract_id = c.id
                 LEFT JOIN (
                     SELECT o.contract_id,
                            SUM(oi.total_price) AS usedAmount
                     FROM orders o
                              JOIN order_items oi ON oi.order_id = o.id
                     GROUP BY o.contract_id
                 ) o_tot ON o_tot.contract_id = c.id
        ${whereClause}
        ORDER BY c.created_at DESC
    `,
    params
  );

  return rows;
}

/**
 * Busca contrato + itens, garantindo (opcionalmente) que pertence ao admin.
 */
async function findContractByIdWithItems(id, adminId) {
  const params = [id];
  let whereAdmin = "";

  if (adminId != null) {
    whereAdmin = " AND c.admin_id = ?";
    params.push(adminId);
  }

  // contrato + totais (valor total, usado e saldo)
  const [contracts] = await db.query(
    `
        SELECT c.id,
               c.number                                                        AS number,
               c.supplier                                                      AS supplier,
               c.start_date                                                    AS startDate,
               c.end_date                                                      AS endDate,
               c.pdf_path                                                      AS pdfPath,
               c.created_at                                                    AS createdAt,
               COALESCE(ci_tot.totalAmount, 0)                                 AS totalAmount,
               COALESCE(o_tot.usedAmount, 0)                                   AS usedAmount,
               COALESCE(ci_tot.totalAmount, 0) - COALESCE(o_tot.usedAmount, 0) AS remainingAmount
        FROM contracts c
                 LEFT JOIN (
            SELECT contract_id,
                   SUM(total_price) AS totalAmount
            FROM contract_items
            WHERE item_no IS NOT NULL -- ignora linha de TOTAL e afins
            GROUP BY contract_id
        ) ci_tot ON ci_tot.contract_id = c.id
                 LEFT JOIN (
            SELECT o.contract_id,
                   SUM(oi.total_price) AS usedAmount
            FROM orders o
                     JOIN order_items oi ON oi.order_id = o.id
            GROUP BY o.contract_id
        ) o_tot ON o_tot.contract_id = c.id
        WHERE c.id = ?${whereAdmin}
        LIMIT 1
    `,
    params
  );

  const contract = contracts[0];
  if (!contract) return null;

  // itens + quantidade usada e disponível
  const [items] = await db.query(
    `
        SELECT ci.id,
               ci.contract_id                                              AS contractId,
               ci.item_no                                                  AS itemNo,
               ci.description,
               ci.unit,
               ci.quantity,
               ci.unit_price                                               AS unitPrice,
               ci.total_price                                              AS totalPrice,
               COALESCE(oi_used.totalUsed, 0)                              AS usedQuantity,
               (COALESCE(ci.quantity, 0) - COALESCE(oi_used.totalUsed, 0)) AS availableQuantity
        FROM contract_items ci
                 LEFT JOIN (
                     SELECT oi.contract_item_id,
                            SUM(oi.quantity) AS totalUsed
                     FROM order_items oi
                     GROUP BY oi.contract_item_id
                 ) oi_used ON oi_used.contract_item_id = ci.id
        WHERE ci.contract_id = ?
        ORDER BY ci.item_no ASC, ci.id ASC
    `,
    [id]
  );

  contract.items = items;
  return contract;
}

/**
 * Atualiza contrato por ID.
 */
async function updateContractById(id, data) {
  const fields = [];
  const values = [];

  if (data.number !== undefined) {
    fields.push("number = ?");
    values.push(data.number);
  }
  if (data.supplier !== undefined) {
    fields.push("supplier = ?");
    values.push(data.supplier);
  }
  if (data.startDate !== undefined) {
    fields.push("start_date = ?");
    values.push(data.startDate || null);
  }
  if (data.endDate !== undefined) {
    fields.push("end_date = ?");
    values.push(data.endDate || null);
  }

  if (!fields.length) return;

  values.push(id);

  await db.query(
    `UPDATE contracts
     SET ${fields.join(", ")}
     WHERE id = ?`,
    values
  );
}

async function deleteContractById(id) {
  await db.query("DELETE FROM contracts WHERE id = ?", [id]);
}

module.exports = {
  createContract,
  bulkInsertContractItems,
  insertContractItem,
  findContractItemByContractAndItemNo,
  getNextItemNoForContract,
  updateContractItemById,
  deleteContractItemById,
  findAllContractsSummary,
  findContractByIdWithItems,
  updateContractById,
  deleteContractById,
};
