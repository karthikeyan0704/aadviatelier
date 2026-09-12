const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberToWords = (value) => {
  const number = Math.round(Number(value) || 0);
  if (number === 0) return 'Rupees Zero Only';
  const belowTwenty = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const wordsUnderThousand = (n) => {
    if (!n) return '';
    if (n < 20) return belowTwenty[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${belowTwenty[n % 10]}` : ''}`;
    return `${belowTwenty[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${wordsUnderThousand(n % 100)}` : ''}`;
  };
  const units = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [1, '']];
  let remaining = number;
  const parts = units.flatMap(([unit, label]) => {
    const count = Math.floor(remaining / unit);
    remaining %= unit;
    return count ? [`${wordsUnderThousand(count)}${label ? ` ${label}` : ''}`] : [];
  });
  return `Rupees ${parts.join(' ')} Only`;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const buildInvoiceHtml = ({ invoiceType, customer, orders, qrDataUri }) => {
  const isFinal = invoiceType === 'final';
  const totalBase = orders.reduce((sum, order) => sum + ((Number(order.stitchingPrice) || 0) * (Number(order.quantity) || 1)), 0);
  const totalAmount = orders.reduce((sum, order) => sum + (Number(order.billing?.estimatedCost) || 0), 0);
  const totalPaid = orders.reduce((sum, order) => sum + (Number(order.billing?.totalPaid ?? order.billing?.advancePaid) || 0), 0);
  const balanceDue = Math.max(totalAmount - totalPaid, 0);
  const extraCharges = orders.flatMap((order, index) => (order.extraCharges || []).map((charge) => ({
    ...charge,
    itemNumber: index + 1,
  })));
  const totalExtra = extraCharges.reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0);
  const createdDate = orders[0]?.createdAt ? new Date(orders[0].createdAt) : new Date();
  const deliveryDate = orders[0]?.deliveryDate ? new Date(orders[0].deliveryDate) : null;
  const rows = orders.map((order, index) => {
    const itemExtra = (order.extraCharges || []).map((charge) => `${escapeHtml(charge.description || 'Additional work')} - ₹${formatAmount(charge.amount)}`).join('<br/>') || '—';
    const notes = escapeHtml(order.specialInstructions || order.description || '—').replace(/\n/g, '<br/>');
    return `<tr><td class="center">${index + 1}</td><td><strong>${escapeHtml(order.category)} - ${escapeHtml(order.dressType)}</strong><br/><span class="muted">${notes}</span></td><td class="right">₹${formatAmount(order.stitchingPrice)}</td><td class="center">${order.quantity || 1}</td><td class="right">₹${formatAmount((Number(order.stitchingPrice) || 0) * (Number(order.quantity) || 1))}</td><td class="extra">${itemExtra}</td><td class="right total-cell">₹${formatAmount(order.billing?.estimatedCost)}</td></tr>`;
  }).join('');
  const extraRows = extraCharges.length ? extraCharges.map((charge, index) => `<tr><td class="center">${index + 1}</td><td>${escapeHtml(charge.description || 'Additional work')}</td><td class="center">${charge.itemNumber}</td><td class="right">₹${formatAmount(charge.amount)}</td></tr>`).join('') : '<tr><td colspan="4" class="center muted">No extra charges</td></tr>';

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#24233a;padding:22px;margin:0;font-size:10px}.invoice{max-width:760px;margin:auto}.brand{text-align:center;border-bottom:2px solid #302b8f;padding-bottom:12px}.brand h1{margin:0;color:#272184;font-size:26px}.brand h2{font-size:15px;letter-spacing:4px;margin:6px 0 3px}.brand p{margin:0;color:#777;font-size:11px}.meta{display:flex;gap:10px;margin:12px 0}.info-box{flex:1;background:#f1efff;padding:10px;border-radius:5px}.info-box h3{margin:0 0 7px;color:#282184;font-size:12px}.info-box p{margin:3px 0}.invoice-meta{max-width:210px}.label{display:inline-block;min-width:72px;font-weight:bold}.table{width:100%;border-collapse:collapse;margin-top:10px}.table th{background:#302b8f;color:#fff;padding:8px 5px;font-size:9px}.table td{border:1px solid #ddd;padding:7px 5px;vertical-align:middle}.center{text-align:center}.right{text-align:right}.muted{color:#666;font-size:9px;line-height:13px}.extra{font-size:9px;line-height:13px}.total-cell{font-weight:bold;font-size:11px}.section-title{background:#eeebff;color:#282184;padding:7px 9px;font-weight:bold;margin-top:10px}.summary-wrap{display:flex;gap:12px;margin-top:12px;align-items:stretch}.payment{width:38%;background:#f5f3ff;text-align:center;padding:10px;border-radius:5px}.payment h3{color:#282184;margin:0 0 8px;font-size:13px}.payment img{width:108px;height:108px}.payment strong{display:block;font-size:14px}.payment .apps{color:#282184;font-size:10px;margin-top:6px}.payment .apps img{width:auto;height:14px;margin:0 7px;vertical-align:middle}.totals{flex:1;border:1px solid #ddd;border-radius:5px;padding:8px}.total-row{display:flex;justify-content:space-between;padding:5px 2px;border-bottom:1px solid #eee}.grand{background:#eeebff;color:#282184;font-size:14px;font-weight:bold;padding:9px 6px;margin:4px -2px}.balance{color:#282184;font-weight:bold;font-size:15px}.words{font-size:10px;margin-top:8px}.bottom{display:flex;gap:12px;border-top:1px solid #302b8f;margin-top:13px;padding-top:10px}.bottom>div{flex:1}.bottom h3{color:#282184;margin:0 0 5px;font-size:12px}.bottom ol,.bottom ul{margin:0;padding-left:15px;line-height:15px;color:#555}.footer{text-align:center;border-top:1px solid #302b8f;margin-top:12px;padding-top:10px;color:#282184}.footer strong{font-size:14px}.footer p{margin:5px 0;color:#555}.contact{display:flex;justify-content:space-around;gap:8px;font-size:9px;flex-wrap:wrap}@media print{body{padding:12px}}
  </style></head><body><div class="invoice"><div class="brand"><h1>Aadvi Designer Studio</h1><h2>${isFinal ? 'FINAL INVOICE' : 'ESTIMATE INVOICE'}</h2><p>Stitching Your Dreams</p></div><div class="meta"><div class="info-box"><h3>Customer Details</h3><p><span class="label">Name</span>: ${escapeHtml(customer?.name || 'Customer')}</p><p><span class="label">Phone</span>: ${escapeHtml(customer?.mobileNumber || '—')}</p><p><span class="label">Address</span>: ${escapeHtml(customer?.address?.fullAddress || customer?.address?.houseLandmark || '—')}</p></div><div class="info-box"><h3>Notes</h3><ul><li>${isFinal ? 'Final bill for completed order(s).' : 'This is an estimated amount based on the current design and measurements.'}</li><li>Final amount may vary if design or material changes are requested.</li></ul></div><div class="info-box invoice-meta"><p><span class="label">Invoice No</span>: ${escapeHtml(orders.map((order) => order.orderId).join(', '))}</p><p><span class="label">Invoice Date</span>: ${createdDate.toLocaleDateString('en-GB')}</p><p><span class="label">Delivery Date</span>: ${deliveryDate ? deliveryDate.toLocaleDateString('en-GB') : '—'}</p></div></div><table class="table"><thead><tr><th>S.No</th><th>Description</th><th>Base Rate (₹)</th><th>Qty</th><th>Base Amount (₹)</th><th>Extra Charges (₹)</th><th>Total Amount (₹)</th></tr></thead><tbody>${rows}</tbody></table><div class="section-title">Extra Charges Summary <span style="float:right;font-weight:normal">Extra charges are for additional materials and workmanship</span></div><table class="table"><thead><tr><th>S.No</th><th>Charge Type</th><th>Item No.</th><th>Amount (₹)</th></tr></thead><tbody>${extraRows}<tr><td colspan="3" class="right"><strong>Total Extra Charges</strong></td><td class="right"><strong>₹${formatAmount(totalExtra)}</strong></td></tr></tbody></table><div class="summary-wrap">${balanceDue > 0 && qrDataUri ? `<div class="payment"><h3>Scan to Pay</h3><img src="${qrDataUri}"/><strong>₹${formatAmount(balanceDue)}</strong><div class="apps"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/120px-Google_Pay_Logo.svg.png" alt="GPay"/><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/120px-PhonePe_Logo.svg.png" alt="PhonePe"/></div></div>` : '<div class="payment"><h3>Payment Complete</h3><p style="margin-top:42px;font-size:13px;color:#15803d;font-weight:bold">No balance due</p></div>'}<div class="totals"><div class="total-row"><span>Subtotal (Base Amount)</span><strong>₹${formatAmount(totalBase)}</strong></div><div class="total-row"><span>Total Extra Charges</span><strong>₹${formatAmount(totalExtra)}</strong></div><div class="total-row grand"><span>Total Amount</span><span>₹${formatAmount(totalAmount)}</span></div><div class="total-row"><span>Paid Amount</span><strong>₹${formatAmount(totalPaid)}</strong></div><div class="total-row balance"><span>Balance Due</span><span>₹${formatAmount(balanceDue)}</span></div><div class="words">Amount in words: ${numberToWords(totalAmount)}</div></div></div><div class="bottom"><div><h3>Terms & Conditions</h3><ol><li>${isFinal ? 'This is the final invoice for your order.' : 'This is an estimate, not a tax invoice.'}</li><li>Final amount may vary for design or material changes.</li><li>Advance payment confirms the order.</li><li>No return or exchange for customized stitching.</li></ol></div><div><h3>Important Note</h3><ul><li>Please review the design, measurements, and order details.</li><li>Inform us promptly if changes are required.</li><li>Delivery date is subject to order requirements.</li><li>Thank you for your trust and support.</li></ul></div></div><div class="footer"><strong>Thank you for choosing Aadvi Designer Studio!</strong><p>We stitch happiness into every outfit.</p><div class="contact"><span>&#128205; Magalam Rd, Palladam, Tamil Nadu - 641664</span><span>&#9742; +91 8807427126</span><span>&#9993; aadviatelier@gmail.com</span></div></div></div></body></html>`;
};
