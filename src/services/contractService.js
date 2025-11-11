const {
  createContract,
  bulkInsertContractItems,
  findAllContractsSummary,
  findContractByIdWithItems
} = require("../db/queries/contracts.queries");

/**
 * Converte "1.234,56" / "1234.56" para número.
 */
function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  let str = String(value).trim();
  if (!str) return null;

  str = str.replace(/\./g, "").replace(/,/g, ".");

  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

/**
 * Cria contrato + itens usando o resultado do microserviço extractor.
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

  const idxItem = columns.findIndex((c) => c.startsWith("ITEM"));
  const idxDesc = columns.findIndex((c) => c.startsWith("DESCRI"));
  const idxUnid = columns.findIndex((c) => c.includes("UNID"));
  const idxQtd = columns.findIndex((c) => c.startsWith("QUANT"));
  const idxVU = columns.findIndex((c) => c.includes("VALOR UNIT"));
  const idxVT = columns.findIndex((c) => c.includes("VALOR TOTAL"));

  // total do contrato: usa soma_valor_total, senão soma os total_price
  let totalAmount = parseNumber(extractData.soma_valor_total);
  if (totalAmount == null && idxVT >= 0) {
    totalAmount = rows.reduce((sum, row) => {
      const v = parseNumber(row[idxVT]);
      return sum + (v || 0);
    }, 0);
  }

  const safeFileName = fileName || "contrato_importado.pdf";

  // NOT NULL: number e pdf_path
  const number =
    extractData.number ||
    extractData.numero ||
    safeFileName ||
    `CONTRATO_IMPORTADO_${Date.now()}`;

  const supplier = extractData.supplier || extractData.fornecedor || null;

  // 1) Cria contrato
  const contractId = await createContract({
    number,
    supplier,
    totalAmount: totalAmount || 0,
    pdfPath: safeFileName,
    startDate: null,
    endDate: null
  });

  // 2) Mapeia linhas em itens
  const items = rows.map((row) => ({
    contractId,
    itemNo: idxItem >= 0 ? parseNumber(row[idxItem]) : null,
    description: idxDesc >= 0 ? row[idxDesc] : null,
    unit: idxUnid >= 0 ? row[idxUnid] : null,
    quantity: idxQtd >= 0 ? parseNumber(row[idxQtd]) : null,
    unitPrice: idxVU >= 0 ? parseNumber(row[idxVU]) : null,
    totalPrice: idxVT >= 0 ? parseNumber(row[idxVT]) : null
  }));

  await bulkInsertContractItems(items);

  // 3) Retorna contrato com itens já no formato do banco
  return findContractByIdWithItems(contractId);
}

async function listContracts() {
  return findAllContractsSummary();
}

async function getContractById(id) {
  return findContractByIdWithItems(id);
}

module.exports = {
  createContractFromExtract,
  listContracts,
  getContractById
};
