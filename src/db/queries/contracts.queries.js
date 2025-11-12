const db = require("../../config/db");

/**
 * Cria um contrato na tabela 'contracts'.
 */
async function createContract({
                                number,
                                supplier,
                                totalAmount,
                                pdfPath,
                                startDate = null,
                                endDate = null
                              }) {
  const [result] = await db.query(
    `
        INSERT INTO contracts
            (number, supplier, total_amount, pdf_path, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `,
    [number, supplier, totalAmount || 0, pdfPath, startDate, endDate]
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
    it.totalPrice ?? null
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
 * Lista contratos com resumo para a tela principal.
 */
async function findAllContractsSummary() {
  const [rows] = await db.query(
    `
        SELECT c.id,
               c.number                                            AS number,
               c.supplier                                          AS supplier,
               c.total_amount                                      AS totalAmount,
               COALESCE(SUM(ci.total_price), 0)                    AS usedAmount,
               (c.total_amount - COALESCE(SUM(ci.total_price), 0)) AS remainingAmount
        FROM contracts c
                 LEFT JOIN contract_items ci ON ci.contract_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
    `
  );

  return rows;
}

/**
 * Busca contrato + itens.
 */
async function findContractByIdWithItems(id) {
  const [contracts] = await db.query(
    `
        SELECT id,
               number       AS number,
               supplier     AS supplier,
               total_amount AS totalAmount,
               start_date   AS startDate,
               end_date     AS endDate,
               pdf_path     AS pdfPath,
               created_at   AS createdAt
        FROM contracts
        WHERE id = ? LIMIT 1
    `,
    [id]
  );

  const contract = contracts[0];
  if (!contract) return null;

  const [items] = await db.query(
    `
        SELECT id,
               item_no     AS itemNo,
               description AS description,
               unit        AS unit,
               quantity    AS quantity,
               unit_price  AS unitPrice,
               total_price AS totalPrice
        FROM contract_items
        WHERE contract_id = ?
        ORDER BY id ASC
    `,
    [id]
  );

  contract.items = items;
  return contract;
}

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
  if (data.totalAmount !== undefined) {
    fields.push("total_amount = ?");
    values.push(data.totalAmount);
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
  findAllContractsSummary,
  findContractByIdWithItems,
  updateContractById,
  deleteContractById,
};
