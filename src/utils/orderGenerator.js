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

async function generateOrderWorkbook({ order, contract }) {
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

  // Data (I5)
  sheet.getCell("I5").value = formatDateToBRDots(order.issueDate);

  // Nome / Razão Social (C18)
  sheet.getCell("C18").value =
    contract.supplier || contract.fornecedor || "";

  // Contrato (E21)
  const contractNumber =
    contract.number || contract.numero || contract.id || "";
  sheet.getCell("E21").value = contractNumber
    ? `CONTRATO Nº ${contractNumber}`
    : "";

  // Justificativa (C44)
  sheet.getCell("C44").value = order.justification || "";

  // Tabela de itens: linhas 24–40, colunas C,D,F,G,H,I
  const START_ROW = 24;
  const MAX_ROWS = 17;

  for (let i = 0; i < MAX_ROWS; i += 1) {
    const rowIndex = START_ROW + i;
    ["C", "D", "F", "G", "H", "I"].forEach((col) => {
      sheet.getCell(`${col}${rowIndex}`).value = null;
    });
  }

  const items = Array.isArray(order.items) ? order.items : [];

  items.slice(0, MAX_ROWS).forEach((item, index) => {
    const rowIndex = START_ROW + index;

    const itemNo =
      item.itemNo ?? item.item_no ?? item.id ?? index + 1;
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

  // TOTAL em I41 já deve ter fórmula no template.

  return workbook;
}

module.exports = {
  generateOrderWorkbook,
};
