const {
  createContract,
  bulkInsertContractItems,
  findAllContractsSummary,
  findContractByIdWithItems,
  updateContractById,
  deleteContractById,
} = require("../db/queries/contracts.queries");

/**
 * Converte "1.234,56" ou "1234.56" ou número direto.
 */
function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  let str = String(value).trim();
  if (!str) return null;

  // 1.234,56 -> 1234.56
  str = str.replace(/\./g, "").replace(/,/g, ".");

  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

/**
 * Cria contrato + itens usando o resultado do microserviço extractor.
 * Não calcula nem envia totalAmount; esse campo deixou de existir no banco.
 * Aceita rows como OBJETO (formato atual) ou como ARRAY (fallback).
 */
async function createContractFromExtract(extractData, fileName) {
  if (!extractData || !Array.isArray(extractData.rows)) {
    const err = new Error("Dados de extração inválidos");
    err.status = 400;
    throw err;
  }

  const columns = (extractData.columns || []).map((c) =>
    String(c || "").trim().toUpperCase()
  );
  const rows = extractData.rows || [];

  console.log("EXTRACT COLUMNS:", columns);
  console.log("EXTRACT FIRST ROW:", rows[0]);

  const items = [];

  for (const row of rows) {
    let itemNo = null;
    let description = null;
    let unit = null;
    let quantity = null;
    let unitPrice = null;
    let totalPrice = null;

    if (Array.isArray(row)) {
      // Modo antigo: linhas como arrays, usando o índice de cada coluna
      const idxItem = columns.findIndex((c) => c.startsWith("ITEM"));
      const idxDesc = columns.findIndex(
        (c) => c.startsWith("DESCRI") || c.includes("DESCRIÇÃO")
      );
      const idxUnid = columns.findIndex((c) => c.includes("UNID"));
      const idxQtd = columns.findIndex(
        (c) => c.startsWith("QUANT") || c.includes("QTD")
      );
      const idxVU = columns.findIndex(
        (c) => c.includes("VALOR_UNIT") || c.includes("VALOR UNIT")
      );
      const idxVT = columns.findIndex(
        (c) => c.includes("VALOR_TOTAL") || c.includes("VALOR TOTAL")
      );

      itemNo = idxItem >= 0 ? parseNumber(row[idxItem]) : null;
      description =
        idxDesc >= 0 && row[idxDesc]
          ? String(row[idxDesc]).trim()
          : null;
      unit =
        idxUnid >= 0 && row[idxUnid]
          ? String(row[idxUnid]).trim()
          : null;
      quantity = idxQtd >= 0 ? parseNumber(row[idxQtd]) : null;
      unitPrice = idxVU >= 0 ? parseNumber(row[idxVU]) : null;
      totalPrice = idxVT >= 0 ? parseNumber(row[idxVT]) : null;
    } else if (row && typeof row === "object") {
      // Formato atual: objeto com chaves amigáveis
      itemNo = parseNumber(row.item ?? row.ITEM);
      description =
        (
          row.descricao ??
          row.descrição ??
          row.DESCRICAO ??
          row.DESCRIÇÃO ??
          ""
        )
          .toString()
          .trim() || null;
      unit =
        (row.unid ?? row.UNID ?? row.unit ?? "")
          .toString()
          .trim() || null;
      quantity = parseNumber(
        row.quant ??
        row.qtd ??
        row.QUANT ??
        row.QTD ??
        row.quantity
      );
      unitPrice = parseNumber(
        row.valor_unit ??
        row.VALOR_UNIT ??
        row.unit_price
      );
      totalPrice = parseNumber(
        row.valor_total ??
        row.VALOR_TOTAL ??
        row.total_price
      );
    }

    // Pula linhas completamente vazias
    const hasData =
      (description && description.length > 0) ||
      quantity !== null ||
      unitPrice !== null ||
      totalPrice !== null;

    if (!hasData) continue;

    items.push({
      contractId: null, // preenchido depois
      itemNo,
      description,
      unit,
      quantity,
      unitPrice,
      totalPrice,
    });
  }

  const safeFileName = fileName || "contrato_importado.pdf";

  const number =
    extractData.number ||
    extractData.numero ||
    safeFileName ||
    `CONTRATO_IMPORTADO_${Date.now()}`;

  const supplier =
    extractData.supplier || extractData.fornecedor || null;

  // 1) Cria contrato (sem totalAmount)
  const contractId = await createContract({
    number,
    supplier,
    pdfPath: safeFileName,
    startDate: null,
    endDate: null,
  });

  // 2) Insere itens com contractId preenchido
  const itemsWithContract = items.map((it) => ({
    ...it,
    contractId,
  }));

  if (itemsWithContract.length) {
    await bulkInsertContractItems(itemsWithContract);
  }

  console.log(
    `ITENS EXTRAÍDOS: ${rows.length}, ITENS INSERIDOS: ${itemsWithContract.length}`
  );

  // 3) Retorna contrato completo
  return findContractByIdWithItems(contractId);
}

async function listContracts() {
  return findAllContractsSummary();
}

async function getContractById(id) {
  return findContractByIdWithItems(id);
}

async function updateContract(id, data) {
  await updateContractById(id, data);
  return findContractByIdWithItems(id);
}

async function removeContract(id) {
  await deleteContractById(id);
}

module.exports = {
  createContractFromExtract,
  listContracts,
  getContractById,
  updateContract,
  removeContract,
};
