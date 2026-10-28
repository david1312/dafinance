import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  accountKindLabel,
  formatMoney,
  formatSignedMoney,
  type Currency,
} from "@/lib/currencies";
import {
  formatClosingLabel,
  formatOpeningLabel,
  formatPeriodLabel,
  type AccountReport,
  type AccountsOverview,
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

function drawHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(207, 95, 128);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("dafinance", 14, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 20);
}

function openPdf(doc: jsPDF) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

function lastTableY(doc: jsPDF, fallback: number) {
  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}

export function openAccountReportPdf(report: AccountReport) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const currency = report.account.currency;
  const period = formatPeriodLabel(report.from, report.to);

  drawHeader(doc, "Account statement");

  doc.setTextColor(63, 43, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(report.account.name, 14, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(151, 122, 131);
  doc.text(`${accountKindLabel(report.account.kind)} · ${currency}`, 14, 47);
  doc.text(`Period: ${period}`, 14, 53);

  doc.setTextColor(63, 43, 51);
  doc.setFontSize(11);
  doc.text(
    `Opening balance  ${money(report.initialBalance, currency)}  (${formatOpeningLabel(report.from)})`,
    14,
    64,
  );

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
      if (data.section === "head" && data.column.index >= 2) {
        data.cell.styles.halign = "right";
      }
      if (data.section !== "body") return;
      if (data.column.index === 2) data.cell.styles.textColor = [95, 163, 124];
      if (data.column.index === 3) data.cell.styles.textColor = [217, 96, 127];
    },
    margin: { left: 14, right: 14 },
  });

  let summaryY = lastTableY(doc, 70) + 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (summaryY > pageHeight - 40) {
    doc.addPage();
    summaryY = 24;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(63, 43, 51);
  doc.text(
    `Closing balance  ${money(report.closingBalance, currency)}  (${formatClosingLabel(report.to)})`,
    14,
    summaryY,
  );
  const netChange = report.closingBalance - report.initialBalance;
  doc.setTextColor(...netChangeRgb(netChange));
  doc.text(
    `Net change  ${formatSignedMoney(netChange, currency)}  (${netChangeLabel(netChange)})`,
    14,
    summaryY + 8,
  );
  doc.setFont("helvetica", "normal");
  doc.setTextColor(95, 163, 124);
  doc.text(`Total money in  ${money(report.totalIn, currency)}`, 14, summaryY + 16);
  doc.setTextColor(217, 96, 127);
  doc.text(`Total money out  ${money(report.totalOut, currency)}`, 14, summaryY + 24);

  openPdf(doc);
}

export function openAccountsOverviewPdf(overview: AccountsOverview) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageHeight = doc.internal.pageSize.getHeight();

  drawHeader(doc, "All accounts overview");

  doc.setTextColor(63, 43, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("All accounts", 14, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(151, 122, 131);
  doc.text(`Period: ${formatPeriodLabel(overview.from, overview.to)}`, 14, 47);
  doc.text(
    `Opening ${formatOpeningLabel(overview.from)} · Closing ${formatClosingLabel(overview.to)}`,
    14,
    53,
  );

  let y = 62;

  for (const group of overview.groups) {
    const currency = group.currency;
    const netChange = group.closingBalance - group.initialBalance;

    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(63, 43, 51);
    doc.text(`${currency} accounts`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...netChangeRgb(netChange));
    doc.text(
      `Net change ${formatSignedMoney(netChange, currency)} (${netChangeLabel(netChange)})`,
      doc.internal.pageSize.getWidth() - 14,
      y,
      { align: "right" },
    );

    autoTable(doc, {
      startY: y + 4,
      head: [["Account", "Opening", "In", "Out", "Closing", "Net change"]],
      body: group.rows.map((row) => [
        `${row.account.name}\n${accountKindLabel(row.account.kind)}`,
        money(row.initialBalance, currency),
        row.totalIn ? money(row.totalIn, currency) : "—",
        row.totalOut ? money(row.totalOut, currency) : "—",
        money(row.closingBalance, currency),
        row.closingBalance === row.initialBalance
          ? "—"
          : formatSignedMoney(row.closingBalance - row.initialBalance, currency),
      ]),
      foot: [
        [
          "Total",
          money(group.initialBalance, currency),
          money(group.totalIn, currency),
          money(group.totalOut, currency),
          money(group.closingBalance, currency),
          formatSignedMoney(netChange, currency),
        ],
      ],
      showFoot: "lastPage",
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
      footStyles: {
        fillColor: [255, 247, 249],
        textColor: [63, 43, 51],
        fontStyle: "bold",
      },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      didParseCell(data) {
        if (data.section !== "body" && data.column.index > 0) {
          data.cell.styles.halign = "right";
        }
        if (data.section === "head") return;
        if (data.column.index === 2) data.cell.styles.textColor = [95, 163, 124];
        if (data.column.index === 3) data.cell.styles.textColor = [217, 96, 127];
        if (data.column.index === 5) {
          const text = String(data.cell.raw ?? "");
          data.cell.styles.textColor = text.startsWith("+")
            ? [95, 163, 124]
            : text.startsWith("-")
              ? [217, 96, 127]
              : [151, 122, 131];
        }
      },
      margin: { left: 14, right: 14 },
    });

    y = lastTableY(doc, y) + 14;
  }

  if (y > pageHeight - 20) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(8);
  doc.setTextColor(151, 122, 131);
  doc.text(
    "Transfers between your own accounts appear as money in on one account and money out on the other, so they cancel out in the totals.",
    14,
    y - 4,
    { maxWidth: doc.internal.pageSize.getWidth() - 28 },
  );

  openPdf(doc);
}

function netChangeLabel(amount: number) {
  if (amount > 0) return "Surplus";
  if (amount < 0) return "Deficit";
  return "No change";
}

function netChangeRgb(amount: number): [number, number, number] {
  if (amount > 0) return [95, 163, 124];
  if (amount < 0) return [217, 96, 127];
  return [151, 122, 131];
}
