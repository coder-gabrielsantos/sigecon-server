const PDFDocument = require("pdfkit");

function formatMoneyBRL(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Gera o PDF da ordem.
 *
 * - NÃO conhece Express nem res.
 * - Apenas recebe os dados e retorna o PDFDocument já preenchido.
 */
function createOrderPdf({ order, contract }) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
  });

  const issueDateBr = formatDateBR(order.issueDate);
  const totalBr = formatMoneyBRL(order.totalAmount);

  // ------------------------------------------------------------------
  // Cabeçalho
  // ------------------------------------------------------------------
  doc
    .fontSize(10)
    .text("PREFEITURA MUNICIPAL DE COELHO NETO", { align: "left" });

  doc.moveDown(0.3);
  doc
    .fontSize(9)
    .text("Secretaria Municipal de Obras e Infraestrutura", { align: "left" });

  doc.moveDown(1);

  // Título da ordem
  const orderType = order.orderType || "ORDEM DE FORNECIMENTO";
  const orderNumber = order.orderNumber || order.id;

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(`${orderType} nº ${orderNumber}`, { align: "center" });

  if (issueDateBr) {
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(`Data de emissão: ${issueDateBr}`, { align: "center" });
  }

  doc.moveDown(1.2);

  // ------------------------------------------------------------------
  // Bloco de informações principais
  // ------------------------------------------------------------------
  const startX = doc.x;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = width / 3;

  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("CONTRATO", startX, doc.y, {
      width: colWidth,
      align: "left",
    });

  doc
    .text("FORNECEDOR", startX + colWidth, doc.y, {
      width: colWidth,
      align: "left",
    });

  doc
    .text("TOTAL DA ORDEM", startX + colWidth * 2, doc.y, {
      width: colWidth,
      align: "left",
    });

  doc.moveDown(0.4);

  doc
    .font("Helvetica")
    .text(contract.number || "—", startX, doc.y, {
      width: colWidth,
      align: "left",
    });

  doc
    .text(contract.supplier || "—", startX + colWidth, doc.y, {
      width: colWidth,
      align: "left",
    });

  doc
    .text(totalBr, startX + colWidth * 2, doc.y, {
      width: colWidth,
      align: "left",
    });

  doc.moveDown(1);

  // Justificativa / finalidade
  doc
    .font("Helvetica-Bold")
    .text("FINALIDADE / JUSTIFICATIVA", {
      align: "left",
    });

  doc.moveDown(0.2);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(order.justification || "—", {
      align: "justify",
    });

  doc.moveDown(1);

  // ------------------------------------------------------------------
  // Tabela de itens
  // ------------------------------------------------------------------
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Itens desta ordem", { align: "left" });

  doc.moveDown(0.3);

  doc
    .fontSize(8)
    .font("Helvetica")
    .text("Baseado nos itens do contrato selecionado.", {
      align: "left",
    });

  doc.moveDown(0.8);

  const tableTop = doc.y;
  const colItem = 40;
  const colDesc = colItem + 40;
  const colUnit = colDesc + 260;
  const colQty = colUnit + 50;
  const colUnitPrice = colQty + 60;
  const colTotal = colUnitPrice + 70;

  // Cabeçalho da tabela
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("Item", colItem, tableTop)
    .text("Descrição", colDesc, tableTop)
    .text("Unid.", colUnit, tableTop, { width: 40, align: "right" })
    .text("Quant.", colQty, tableTop, { width: 50, align: "right" })
    .text("V. unitário", colUnitPrice, tableTop, {
      width: 70,
      align: "right",
    })
    .text("V. total", colTotal, tableTop, { width: 70, align: "right" });

  doc.moveTo(colItem, tableTop + 12)
    .lineTo(colTotal + 70, tableTop + 12)
    .stroke();

  doc.moveDown(0.6);

  // Linhas da tabela
  doc.font("Helvetica").fontSize(8);

  const items = order.items || [];
  let y = doc.y;

  for (const it of items) {
    // Quebra de página simples
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = doc.y;
    }

    const itemNo = it.itemNo ?? it.item_no ?? it.contractItemId ?? "-";
    const unit = it.unit || "—";
    const quantity = Number(it.quantity ?? 0);
    const unitPrice = Number(it.unitPrice ?? it.unit_price ?? 0);
    const totalPrice = Number(it.totalPrice ?? it.total_price ?? 0);

    const lineHeight = 14;

    doc.text(itemNo, colItem, y, { width: 40 });
    doc.text(it.description || "", colDesc, y, { width: 260 });
    doc.text(unit, colUnit, y, { width: 40, align: "right" });
    doc.text(String(quantity), colQty, y, { width: 50, align: "right" });
    doc.text(formatMoneyBRL(unitPrice), colUnitPrice, y, {
      width: 70,
      align: "right",
    });
    doc.text(formatMoneyBRL(totalPrice), colTotal, y, {
      width: 70,
      align: "right",
    });

    y += lineHeight;

    doc
      .moveTo(colItem, y - 2)
      .lineTo(colTotal + 70, y - 2)
      .strokeColor("#dddddd")
      .stroke()
      .strokeColor("black");
  }

  // Total geral ao final da tabela
  doc.moveDown(1);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(`Total da ordem: ${totalBr}`, {
      align: "right",
    });

  doc.moveDown(2);

  // Assinatura / rodapé simples
  doc
    .font("Helvetica")
    .fontSize(8)
    .text("__________________________________________", {
      align: "left",
    });
  doc.text("Secretário(a) Municipal", { align: "left" });

  return doc;
}

module.exports = {
  createOrderPdf,
};
