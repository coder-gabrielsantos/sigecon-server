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

async function generateOrderWorkbook({ order, contract, extras = {} }) {
  const workbook = new ExcelJS.Workbook();

  const templatePath = path.join(
    __dirname,
    "..",
    "templates",
    "ordem-template.xlsx"
  );

  await workbook.xlsx.readFile(templatePath);

  const sheet =
    workbook.getWorksheet("001") || workbook.worksheets[0];

  // --------- EXTRAS DO FORM (com defaults) ---------
  const {
    orderTypeText = order.orderType || "",
    deText = "SECRETARIA MUNICIPAL DE GESTÃO E ORÇAMENTO.",
    paraText = "05.281.738/0001-98",
    nomeRazao = "S. T. BORBA",
    endereco = "RUA DEP. RAIMUNDO BACELAR,421, CENTRO, COELHO NETO-MA",
    celularTexto = "CONTRATO Nº 009 DE 09 DE JANEIRO DE 2025.",
    justificativaCampo = order.justification || "",
    tiposDespesaSelecionados = [],
    modalidadesSelecionadas = [],
  } = extras || {};

  // --------- CAMPOS PRINCIPAIS ---------

  // Tipo de ordem – célula 4 E–I
  sheet.getCell("E4").value = orderTypeText;

  // Data – célula 5 I
  sheet.getCell("I5").value = formatDateToBRDots(order.issueDate);

  // De / Para – linha 8
  sheet.getCell("C8").value = deText;
  sheet.getCell("F8").value = paraText;

  // Nome / razão social – 18 CDEF
  sheet.getCell("C18").value = nomeRazao;

  // Endereço – 20/21 CD
  sheet.getCell("C20").value = endereco;

  // Texto extra (20 EF)
  sheet.getCell("E20").value = celularTexto;

  // Mesmo nome na seção de assinatura – 46 CD
  sheet.getCell("C46").value = nomeRazao;

  // Justificativa / Finalidade / Período – 44 CDEFGHI
  sheet.getCell("C44").value = justificativaCampo;

  // --------- TIPOS DE DESPESA (11–13 HI) ---------
  const expenseRows = [11, 12, 13];

  expenseRows.forEach((row) => {
    sheet.getCell(`H${row}`).value = null;
  });

  tiposDespesaSelecionados
    .slice(0, expenseRows.length)
    .forEach((text, idx) => {
      const row = expenseRows[idx];
      sheet.getCell(`H${row}`).value = text;
    });

  // --------- MODALIDADES (17–21 HI) ---------
  const modalityRows = [17, 18, 19, 20, 21];

  modalityRows.forEach((row) => {
    sheet.getCell(`H${row}`).value = null;
  });

  modalidadesSelecionadas
    .slice(0, modalityRows.length)
    .forEach((text, idx) => {
      const row = modalityRows[idx];
      sheet.getCell(`H${row}`).value = text;
    });

  // --------- ITENS (24–40) ---------
  const START_ROW = 24;
  const MAX_ROWS = 17;

  for (let i = 0; i < MAX_ROWS; i += 1) {
    const rowIndex = START_ROW + i;
    ["C", "D", "F", "G", "H", "I"].forEach((col) => {
      sheet.getCell(`${col}${rowIndex}`).value = null;
    });
  }

  const items = Array.isArray(order.items) ? order.items : [];

  items.slice(0, MAX_ROWS).forEach((item, idx) => {
    const rowIndex = START_ROW + idx;

    const itemNo =
      item.itemNo ?? item.item_no ?? item.id ?? idx + 1;
    const description = item.description || "";
    const unit = item.unit || "";
    const quantity = Number(item.quantity ?? 0) || 0;
    const unitPrice =
      Number(item.unitPrice ?? item.unit_price ?? 0) || 0;
    const totalPrice =
      Number(item.totalPrice ?? item.total_price ?? 0) || 0;

    sheet.getCell(`C${rowIndex}`).value = itemNo;
    sheet.getCell(`D${rowIndex}`).value = description;
    sheet.getCell(`F${rowIndex}`).value = unit;
    sheet.getCell(`G${rowIndex}`).value = quantity;
    sheet.getCell(`H${rowIndex}`).value = unitPrice;
    sheet.getCell(`I${rowIndex}`).value = totalPrice;
  });

  return workbook;
}

module.exports = {
  generateOrderWorkbook,
};
