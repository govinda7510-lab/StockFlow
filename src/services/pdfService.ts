import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { StockItem, Settings } from '../database/database';
import { format } from 'date-fns';

const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '—';
  return `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
};

const formatDate = (): string => {
  return format(new Date(), 'dd MMM yyyy, hh:mm a');
};

const getTotalValue = (items: StockItem[]): number => {
  return items.reduce((acc, item) => {
    if (item.price !== null && item.price !== undefined) {
      return acc + item.quantity * item.price;
    }
    return acc;
  }, 0);
};

export const generatePDF = async (
  items: StockItem[],
  settings: Settings | null
): Promise<void> => {
  const shopName = settings?.shop_name || 'StockFlow';
  const contact = settings?.contact_number || '';
  const generatedAt = formatDate();
  const totalValue = getTotalValue(items);

  const tableRows = items
    .map(
      (item, index) => `
      <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
        <td class="center">${index + 1}</td>
        <td>${escapeHtml(item.name)}</td>
        <td class="center">${escapeHtml(item.category || 'General')}</td>
        <td class="center">${item.quantity} ${escapeHtml(item.unit || 'pcs')}</td>
        <td class="center">${formatCurrency(item.price)}</td>
        <td class="right">${
          item.price !== null ? formatCurrency(item.quantity * item.price) : '—'
        }</td>
        <td class="center status-${item.quantity === 0 ? 'out' : item.quantity <= 5 ? 'low' : 'ok'}">
          ${item.quantity === 0 ? 'Out of Stock' : item.quantity <= 5 ? 'Low Stock' : 'In Stock'}
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StockFlow Inventory Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      color: #1e293b;
      background: #fff;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      color: white;
      padding: 28px 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-left .logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #38bdf8;
    }
    .header-left .tagline {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .header-right { text-align: right; }
    .header-right .shop-name {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header-right .contact, .header-right .date {
      font-size: 11px;
      color: #94a3b8;
    }

    /* Summary cards */
    .summary {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 16px 32px;
      display: flex;
      gap: 24px;
    }
    .summary-card {
      flex: 1;
      background: white;
      border-radius: 8px;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
    }
    .summary-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-card .value { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .summary-card .value.blue { color: #2563eb; }
    .summary-card .value.green { color: #16a34a; }
    .summary-card .value.orange { color: #ea580c; }

    /* Table */
    .table-section { padding: 20px 32px 32px; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #38bdf8;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead tr {
      background: #0f172a;
      color: white;
    }
    thead th {
      padding: 10px 12px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    tr.even { background: #f8fafc; }
    tr.odd { background: white; }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 11.5px;
    }
    .center { text-align: center; }
    .right { text-align: right; font-weight: 600; }
    .status-ok { color: #16a34a; font-weight: 600; }
    .status-low { color: #ea580c; font-weight: 600; }
    .status-out { color: #dc2626; font-weight: 700; }

    /* Footer */
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 12px 32px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }

    /* Total row */
    .total-row td {
      font-weight: 700;
      background: #eff6ff;
      border-top: 2px solid #2563eb;
      font-size: 12px;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="logo">📦 StockFlow</div>
      <div class="tagline">Inventory Management Report</div>
    </div>
    <div class="header-right">
      <div class="shop-name">${escapeHtml(shopName)}</div>
      ${contact ? `<div class="contact">📞 ${escapeHtml(contact)}</div>` : ''}
      <div class="date">Generated: ${generatedAt}</div>
    </div>
  </div>

  <!-- Summary -->
  <div class="summary">
    <div class="summary-card">
      <div class="label">Total Items</div>
      <div class="value blue">${items.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">In Stock</div>
      <div class="value green">${items.filter(i => i.quantity > 0).length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Low Stock</div>
      <div class="value orange">${items.filter(i => i.quantity > 0 && i.quantity <= 5).length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Out of Stock</div>
      <div class="value" style="color:#dc2626">${items.filter(i => i.quantity === 0).length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Value</div>
      <div class="value green">${formatCurrency(totalValue)}</div>
    </div>
  </div>

  <!-- Table -->
  <div class="table-section">
    <div class="section-title">Inventory Details</div>
    <table>
      <thead>
        <tr>
          <th class="center">#</th>
          <th>Item Name</th>
          <th class="center">Category</th>
          <th class="center">Qty</th>
          <th class="center">Unit Price</th>
          <th class="right">Total Value</th>
          <th class="center">Status</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        <tr class="total-row">
          <td colspan="5" class="right">TOTAL INVENTORY VALUE</td>
          <td class="right">${formatCurrency(totalValue)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>StockFlow — Smart Warehouse Management</span>
    <span>Report generated on ${generatedAt}</span>
  </div>

</body>
</html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share StockFlow Report',
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (error) {
    throw new Error(`PDF generation failed: ${error}`);
  }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
