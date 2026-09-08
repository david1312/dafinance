import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney, type Currency } from "@/lib/currencies";
import {
  formatPeriodLabel,
  type AccountReport,
} from "@/lib/account-report";

function money(value: number, currency: Currency) {
  return formatMoney(value, currency);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function openAccountReportPdf(report: AccountReport) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const currency = report.account.currency;
  const pageWidth = doc.internal.pageSize.getWidth();
  const period = formatPeriodLabel(report.from, report.to);

  doc.setFillColor(207, 95, 128);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("dafinance", 14, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Account statement", 14, 20);

  doc.setTextColor(63, 43, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(report.account.name, 14, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(151, 122, 131);
  doc.text(`${report.account.kind} · ${currency}`, 14, 47);
  doc.text(`Period: ${period}`, 14, 53);

  doc.setTextColor(63, 43, 51);
  doc.setFontSize(11);
  doc.text(`Initial balance  ${money(report.initialBalance, currency)}`, 14, 64);

  autoTable(doc, {
    startY: 70,
    head: [["Date", "Description", "In", "Out", "Balance"]],
    body: report.rows.map((row) => [
      dateLabel(row.occurredOn),
      row.description,
      row.inAmount ? money(row.inAmount, currency) : "—",
      row.outAmount ? money(row.outAmount, currency) : "—",
      money(row.balance, currency),
    ]),
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [63, 43, 51],
      lineColor: [247, 219, 226],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [253, 238, 242],
      textColor: [151, 122, 131],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 28 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 32 },
      4: { halign: "right", cellWidth: 36 },
    },
    didParseCell(data) {
      if (data.section !== "body") return;
      if (data.column.index === 2) data.cell.styles.textColor = [95, 163, 124];
      if (data.column.index === 3) data.cell.styles.textColor = [217, 96, 127];
    },
    margin: { left: 14, right: 14 },
  });

  const afterTableY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 70;
  let summaryY = afterTableY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (summaryY > pageHeight - 32) {
    doc.addPage();
    summaryY = 24;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(63, 43, 51);
  doc.text(`Closing balance  ${money(report.closingBalance, currency)}`, 14, summaryY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(95, 163, 124);
  doc.text(`Total money in  ${money(report.totalIn, currency)}`, 14, summaryY + 8);
  doc.setTextColor(217, 96, 127);
  doc.text(`Total money out  ${money(report.totalOut, currency)}`, 14, summaryY + 16);

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}
