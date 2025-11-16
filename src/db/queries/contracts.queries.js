const db = require("../../config/db");

/**
 * Cria um contrato na tabela 'contracts'.
 * Agora sem o campo total_amount.
 */
async function createContract({
                                number,
                                supplier,
                                pdfPath,
                                startDate = null,
                                endDate = null,
                              }) {
  const [result] = await db.query(
    `
        INSERT INTO contracts
            (number, supplier, pdf_path, start_date, end_date)
        VALUES (?, ?, ?, ?, ?)
    `,
    [number, supplier, pdfPath, startDate, endDate]
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
 * Lista contratos com resumo para a tela principal.
 * Removido total_amount / remainingAmount, mantém apenas usedAmount.
 */
async function findAllContractsSummary() {
  const [rows] = await db.query(
    `
        SELECT c.id,
               c.number                         AS number,
               c.supplier                       AS supplier,
               COALESCE(SUM(ci.total_price), 0) AS usedAmount
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
 * Removido total_amount (totalAmount) do SELECT.
 */
async function findContractByIdWithItems(id) {
  const [contracts] = await db.query(
    `
        SELECT id,
               number     AS number,
               supplier   AS supplier,
               start_date AS startDate,
               end_date   AS endDate,
               pdf_path   AS pdfPath,
               created_at AS createdAt
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

/**
 * Atualiza contrato por ID.
 * Removido suporte a totalAmount / total_amount.
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
  findAllContractsSummary,
  findContractByIdWithItems,
  updateContractById,
  deleteContractById,
};
