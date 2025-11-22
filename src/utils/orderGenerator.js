const path = require("path");
const ExcelJS = require("exceljs");

function formatDateToBRDots(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Gera o workbook do Excel com base no template e nos dados da ordem.
 *
 * @param {Object} params
 * @param {Object} params.order      - Dados da ordem (itens, datas, etc.).
 * @param {Object} params.contract   - Dados do contrato (se precisar futuramente).
 * @param {Object} params.extras     - Campos vindos do forms (tipos de despesa, modalidades, etc.).
 */
async function generateOrderWorkbook({ order, contract, extras = {} }) {
  const workbook = new ExcelJS.Workbook();

  const templatePath = path.join(
    __dirname,
    "..",
    "templates",
    "ordem-template.xlsx"
  );

  await workbook.xlsx.readFile(templatePath);

  const sheet = workbook.getWorksheet("001") || workbook.worksheets[0];

  // -------------------------------------------------
  // 1. Campos vindos do forms
  // -------------------------------------------------
  const {
    orderTypeText = order.orderType || "",
    deText = "SECRETARIA MUNICIPAL DE GESTÃO E ORÇAMENTO.",
    paraText = "05.281.738/0001-98",
    nomeRazao = "S. T. BORBA",
    endereco = "RUA DEP. RAIMUNDO BACELAR,421, CENTRO, COELHO NETO-MA",
    // CNPJ que vai na célula 20EF
    cnpjTexto = "63.411.730/0001-03",
    // Texto do contrato, vai em 21EF
    celularTexto = "CONTRATO Nº 009 DE 09 DE JANEIRO DE 2025.",
    justificativaCampo = order.justification || "",
    tiposDespesaSelecionados = [],
    modalidadesSelecionadas = [],
    // Nome que vai na linha da assinatura (pode ser diferente do fornecedor)
    assinaturaNome = "",
  } = extras || {};

  // -------------------------------------------------
  // 2. Cabeçalho principal
  // -------------------------------------------------
  // Tipo da ordem - prefixo "Ordem de "
  sheet.getCell("E4").value = orderTypeText
    ? `Ordem de ${orderTypeText}`
    : "";

  // Data de emissão (dd.mm.aaaa)
  const issueDate = order.issueDate || order.createdAt || order.date;
  sheet.getCell("I5").value = formatDateToBRDots(issueDate);

  // De / Para
  sheet.getCell("C8").value = deText;
  sheet.getCell("F8").value = paraText;

  // Nome / razão social e endereço
  sheet.getCell("C18").value = nomeRazao;
  sheet.getCell("C20").value = endereco;

  // CNPJ fixo em 20EF
  sheet.getCell("E20").value = cnpjTexto;

  // Texto do contrato em 21EF
  sheet.getCell("E21").value = celularTexto;

  // -------------------------------------------------
  // 3. Tipos de despesa (G11–G13 com check, H11–H13 com texto)
  // -------------------------------------------------
  const tiposDespesaLinhas = [11, 12, 13];

  tiposDespesaLinhas.forEach((rowNumber) => {
    sheet.getCell(`G${rowNumber}`).value = null;
    sheet.getCell(`H${rowNumber}`).value = null;
  });

  tiposDespesaSelecionados
    .slice(0, tiposDespesaLinhas.length)
    .forEach((texto, index) => {
      const rowNumber = tiposDespesaLinhas[index];
      // check
      sheet.getCell(`G${rowNumber}`).value = "✔";
      sheet.getCell(`H${rowNumber}`).value = texto;
    });

  // -------------------------------------------------
  // 4. Modalidades (G17–G21 com check, H17–H21 com texto)
  // -------------------------------------------------
  const modalidadesLinhas = [17, 18, 19, 20, 21];

  modalidadesLinhas.forEach((rowNumber) => {
    sheet.getCell(`G${rowNumber}`).value = null;
    sheet.getCell(`H${rowNumber}`).value = null;
  });

  modalidadesSelecionadas
    .slice(0, modalidadesLinhas.length)
    .forEach((texto, index) => {
      const rowNumber = modalidadesLinhas[index];
      sheet.getCell(`G${rowNumber}`).value = "✔";
      sheet.getCell(`H${rowNumber}`).value = texto;
    });

  // -------------------------------------------------
  // 5. Itens da ordem (a partir da linha 24)
  // -------------------------------------------------
  const START_ROW = 24;
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsCount = items.length;

  const extraRows = itemsCount > 0 ? itemsCount - 1 : 0;

  if (itemsCount === 0) {
    const row = sheet.getRow(START_ROW);
    ["C", "D", "F", "G", "H", "I"].forEach((col) => {
      row.getCell(col).value = null;
    });
  } else {
    if (extraRows > 0) {
      sheet.duplicateRow(START_ROW, extraRows, true);
    }

    items.forEach((item, index) => {
      const rowIndex = START_ROW + index;
      const row = sheet.getRow(rowIndex);

      const itemNo = item.itemNo ?? item.item_no ?? item.id ?? index + 1;
      const description = item.description || "";
      const unit = item.unit || "";
      const quantity = Number(item.quantity ?? 0) || 0;
      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0) || 0;
      const totalPrice =
        Number(item.totalPrice ?? item.total_price ?? quantity * unitPrice) ||
        0;

      row.getCell("C").value = itemNo;
      row.getCell("D").value = description;
      row.getCell("F").value = unit;
      row.getCell("G").value = quantity;
      row.getCell("H").value = unitPrice;
      row.getCell("I").value = totalPrice;

      row.getCell("H").numFmt = '"R$" #,##0.00';
      row.getCell("I").numFmt = '"R$" #,##0.00';
    });
  }

  // -------------------------------------------------
  // 6. Justificativa e Assinatura usando as linhas do template
  // -------------------------------------------------
  // No template original:
  // - justificativa está em C28 (mesclado C28:I28)
  // - nome da assinatura está em C30 (mesclado C30:D30)
  // Depois de inserir itens, tudo desce "extraRows" linhas
  const justificativaRow = 28 + extraRows;
  const assinaturaRow = 30 + extraRows;

  if (justificativaCampo) {
    sheet.getCell(`C${justificativaRow}`).value = justificativaCampo;
  }

  if (assinaturaNome) {
    sheet.getCell(`C${assinaturaRow}`).value = assinaturaNome;
  }

  // -------------------------------------------------
  // 7. TOTAL (soma automática + "R$" no total)
  // -------------------------------------------------
  let totalRow = null;
  let totalCol = null;

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      const v = typeof cell.value === "string" ? cell.value.trim() : null;
      if (v && v.toUpperCase().startsWith("TOTAL")) {
        totalRow = rowNumber;
        totalCol = colNumber;
      }
    });
  });

  if (totalRow && totalCol) {
    const labelCell = sheet.getCell(totalRow, totalCol);
    const valueCell = sheet.getCell(totalRow, totalCol + 1);

    labelCell.value = "TOTAL R$";

    if (itemsCount > 0) {
      const firstItemRow = START_ROW;
      const lastItemRow = START_ROW + itemsCount - 1;

      valueCell.value = {
        formula: `SUM(I${firstItemRow}:I${lastItemRow})`,
      };
    } else {
      valueCell.value = 0;
    }

    valueCell.numFmt = '"R$" #,##0.00';
  }

  return workbook;
}

module.exports = {
  generateOrderWorkbook,
};
