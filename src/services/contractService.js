const {
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
} = require("../db/queries/contracts.queries");

/**
 * Converte "1.234,56" ou "1234.56" ou número direto.
 */
function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  let str = String(value).trim();
  if (!str) return null;

  // remove símbolo de moeda e espaços
  str = str.replace(/R\$/gi, "").replace(/\s+/g, "");

  // 1.234,56 -> 1234.56
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

    const hasData =
      (description && description.length > 0) ||
      quantity !== null ||
      unitPrice !== null ||
      totalPrice !== null;

    if (!hasData) continue;

    // ---- NOVO: pular linha de "TOTAL GERAL" do extrator ----
    const descUpper = (description || "").toString().trim().toUpperCase();
    const looksLikeTotal =
      descUpper.startsWith("TOTAL") ||
      descUpper.includes("VALOR TOTAL");

    const isSummaryRow =
      (itemNo === null || itemNo === 0) &&
      (!unit || unit.trim() === "") &&
      (quantity === null || quantity === 0) &&
      (unitPrice === null || unitPrice === 0) &&
      totalPrice !== null &&
      looksLikeTotal;

    if (isSummaryRow) {
      console.log("Ignorando linha de TOTAL do extrator:", row);
      continue;
    }
    // --------------------------------------------------------

    items.push({
      contractId: null,
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

  const contractId = await createContract({
    number,
    supplier,
    pdfPath: safeFileName,
    startDate: null,
    endDate: null,
  });

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

  return findContractByIdWithItems(contractId);
}

async function createEmptyContract(data = {}) {
  const rawNumber =
    data.number && String(data.number).trim().length
      ? String(data.number).trim()
      : null;

  const number =
    rawNumber ||
    `Novo contrato ${new Date().getFullYear()}-${Date.now()
      .toString()
      .slice(-6)}`;

  const supplier =
    data.supplier !== undefined && data.supplier !== null
      ? String(data.supplier).trim() || null
      : null;

  const startDate = data.startDate || null;
  const endDate = data.endDate || null;

  // IMPORTANTE: pdf_path não pode ser null na tabela
  const pdfPath = "[CONTRATO EM BRANCO]";

  const contractId = await createContract({
    number,
    supplier,
    pdfPath,
    startDate,
    endDate,
  });

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

/**
 * Adiciona ou atualiza um item de contrato.
 *
 * - Se payload.itemNo existe:
 *     - se existir (contract_id, item_no) -> atualiza usando dados atuais para recalcular total
 *     - se não existir -> insere novo item com esse itemNo
 * - Se payload.itemNo não existe:
 *     - insere novo item usando próximo item_no sequencial
 *
 * Sempre que quantidade OU valor unitário forem enviados,
 * o total_price é recalculado usando (quantidade efetiva * unitPrice efetivo).
 */
async function upsertContractItem(contractId, payload = {}) {
  const idNum = Number(contractId);
  if (!idNum || Number.isNaN(idNum)) {
    const err = new Error("ID de contrato inválido.");
    err.status = 400;
    throw err;
  }

  const contract = await findContractByIdWithItems(idNum);
  if (!contract) {
    const err = new Error("Contrato não encontrado.");
    err.status = 404;
    throw err;
  }

  // itemNo (opcional)
  let itemNo =
    payload.itemNo !== undefined ? parseNumber(payload.itemNo) : null;
  if (itemNo !== null) {
    itemNo = Math.floor(itemNo);
    if (!Number.isFinite(itemNo) || itemNo <= 0) {
      const err = new Error("Número de item inválido.");
      err.status = 400;
      throw err;
    }
  }

  const description =
    payload.description !== undefined
      ? String(payload.description || "").trim() || null
      : undefined;

  const unit =
    payload.unit !== undefined
      ? String(payload.unit || "").trim() || null
      : undefined;

  const quantityFromPayload =
    payload.quantity !== undefined
      ? parseNumber(payload.quantity)
      : undefined;

  const unitPriceFromPayload =
    payload.unitPrice !== undefined
      ? parseNumber(payload.unitPrice)
      : undefined;

  const hasAnyField =
    description !== undefined ||
    unit !== undefined ||
    quantityFromPayload !== undefined ||
    unitPriceFromPayload !== undefined;

  if (!hasAnyField) {
    const err = new Error(
      "Nenhum campo para adicionar ou atualizar no item."
    );
    err.status = 400;
    throw err;
  }

  // Se não veio itemNo, pega o próximo número sequencial
  if (!itemNo) {
    itemNo = await getNextItemNoForContract(idNum);
  }

  const existing = await findContractItemByContractAndItemNo(
    idNum,
    itemNo
  );

  // Monta base de dados (comum para update/insert)
  const baseData = { itemNo };
  if (description !== undefined) baseData.description = description;
  if (unit !== undefined) baseData.unit = unit;

  if (existing) {
    // ---- ATUALIZAR ITEM EXISTENTE ----
    const existingQuantity =
      existing.quantity !== null && existing.quantity !== undefined
        ? parseNumber(existing.quantity)
        : null;
    const existingUnitPrice =
      existing.unitPrice !== null && existing.unitPrice !== undefined
        ? parseNumber(existing.unitPrice)
        : null;

    // Quantidade e valor unitário efetivos (payload > banco)
    const effectiveQuantity =
      quantityFromPayload !== undefined
        ? quantityFromPayload
        : existingQuantity;
    const effectiveUnitPrice =
      unitPriceFromPayload !== undefined
        ? unitPriceFromPayload
        : existingUnitPrice;

    if (effectiveQuantity !== null && effectiveQuantity !== undefined) {
      baseData.quantity = effectiveQuantity;
    }
    if (effectiveUnitPrice !== null && effectiveUnitPrice !== undefined) {
      baseData.unitPrice = effectiveUnitPrice;
    }

    // Se tivermos os dois, recalculamos SEMPRE o total
    if (
      effectiveQuantity !== null &&
      effectiveQuantity !== undefined &&
      effectiveUnitPrice !== null &&
      effectiveUnitPrice !== undefined
    ) {
      baseData.totalPrice = effectiveQuantity * effectiveUnitPrice;
    }

    await updateContractItemById(existing.id, baseData);
  } else {
    // ---- INSERIR NOVO ITEM ----
    const newQuantity =
      quantityFromPayload !== undefined ? quantityFromPayload : null;
    const newUnitPrice =
      unitPriceFromPayload !== undefined ? unitPriceFromPayload : null;

    const insertData = {
      contractId: idNum,
      itemNo,
      description:
        baseData.description !== undefined ? baseData.description : null,
      unit: baseData.unit !== undefined ? baseData.unit : null,
      quantity: newQuantity,
      unitPrice: newUnitPrice,
      totalPrice: null,
    };

    if (
      newQuantity !== null &&
      newQuantity !== undefined &&
      newUnitPrice !== null &&
      newUnitPrice !== undefined
    ) {
      insertData.totalPrice = newQuantity * newUnitPrice;
    }

    await insertContractItem(insertData);
  }

  // Retorna contrato completo atualizado
  return findContractByIdWithItems(idNum);
}

module.exports = {
  createContractFromExtract,
  createEmptyContract,
  listContracts,
  getContractById,
  updateContract,
  removeContract,
  upsertContractItem,
};
