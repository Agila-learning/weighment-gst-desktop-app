import puppeteer from 'puppeteer';
import prisma from '../prisma';
import { numberToWords } from './numberToWords';

export const generateInvoicePDF = async (invoiceId: string, template: string = 'color'): Promise<string> => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, items: { include: { material: true } }, vehicle: true }
  });

  if (!invoice) throw new Error('Invoice not found');
  
  const company = await prisma.companySetting.findFirst() || {
    companyName: 'Company Name',
    address: 'Address',
    gstin: 'GSTIN',
    stateName: '',
    stateCode: '',
    email: '',
    phone: '',
    bankDetails: '',
    upiDetails: '',
    declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    termsAndConditions: '',
    authSignatoryName: '',
    authSignatoryDesignation: '',
    logoUrl: '',
    sealImageUrl: '',
    signatureImageUrl: '',
    upiId: '',
    showQrOnInvoice: false
  };

  const amountInWords = numberToWords(invoice.grandTotal);
  const taxInWords = numberToWords(invoice.taxTotal);

  // Group tax by HSN
  const taxSummary: Record<string, { taxable: number; cgstRate: number; sgstRate: number; igstRate: number; cgstAmount: number; sgstAmount: number; igstAmount: number; totalTax: number }> = {};
  
  invoice.items.forEach((rawItem) => {
    const item: any = rawItem;
    const hsn = item.hsnCode || '-';
    if (!taxSummary[hsn]) {
      taxSummary[hsn] = { taxable: 0, cgstRate: item.cgstRate || 0, sgstRate: item.sgstRate || 0, igstRate: item.igstRate || 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0 };
    }
    taxSummary[hsn].taxable += item.amount;
    taxSummary[hsn].cgstAmount += item.cgstAmount || 0;
    taxSummary[hsn].sgstAmount += item.sgstAmount || 0;
    taxSummary[hsn].igstAmount += item.igstAmount || 0;
    taxSummary[hsn].totalTax += item.taxAmount;
  });

  const isBw = template === 'bw';
  const primaryColor = isBw ? '#000000' : '#1e3a8a';
  const headerBgColor = isBw ? '#e5e7eb' : '#f0f4f8';
  const textColor = isBw ? '#000000' : '#111827';
  const labelColor = isBw ? '#333333' : '#6b7280';
  const muteColor = isBw ? '#555555' : '#4b5563';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page { size: A4; margin: 5mm; }
        * { box-sizing: border-box; }
        html { background: #f3f4f6; }
        body { 
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
          font-size: 10px; 
          line-height: 1.3; 
          color: #333; 
          margin: 0 auto; 
          padding: 5mm;
          background: white;
          max-width: 210mm;
          min-height: 297mm;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .invoice-box { 
          width: 100%; 
          min-height: 287mm; /* Ensures footer stays at bottom on single page */
          border: 1px solid ${primaryColor}; 
          border-radius: 4px; 
          display: flex; 
          flex-direction: column; 
        }
        .items-container {
          flex: 1; /* Pushes footer to the bottom */
        }
        @media print {
          html, body { background: white; box-shadow: none; margin: 0; padding: 0; max-width: 100%; min-height: auto; }
          .invoice-box { border-radius: 0; height: auto; min-height: auto; max-height: none; page-break-inside: avoid; }
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .border-b { border-bottom: 1px solid #e5e7eb; }
        .border-r { border-right: 1px solid #e5e7eb; }
        .p-2 { padding: 4px 8px; }
        .w-full { width: 100%; }
        
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 4px 6px; vertical-align: top; }
        
        .header-title { font-size: 16px; font-weight: bold; text-align: center; padding: 6px; background-color: ${primaryColor}; color: white; border-bottom: 1px solid ${primaryColor}; letter-spacing: 1px; }
        
        .grid-2 { display: table; width: 100%; table-layout: fixed; border-bottom: 1px solid #e5e7eb; }
        .grid-2 > div { display: table-cell; width: 50%; padding: 8px; }
        .grid-2 > div:first-child { border-right: 1px solid #e5e7eb; }
        
        .items-table th { background-color: ${headerBgColor}; color: ${primaryColor}; border: 1px solid #e5e7eb; text-align: left; font-size: 10px; text-transform: uppercase; }
        .items-table td { border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .items-table tr.last-row td { border-bottom: 1px solid ${primaryColor}; padding-bottom: 20px; }
        
        .totals-grid { display: table; width: 100%; border-bottom: 1px solid ${primaryColor}; }
        .totals-grid > div { display: table-cell; vertical-align: top; }
        .totals-left { width: 60%; padding: 8px; border-right: 1px solid ${primaryColor}; }
        .totals-right { width: 40%; }
        
        .totals-table td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; }
        
        .tax-table th, .tax-table td { border: 1px solid #e5e7eb; text-align: right; }
        .tax-table th { background-color: ${headerBgColor}; color: ${primaryColor}; text-align: center; font-size: 10px; }
        
        .footer { display: table; width: 100%; margin-top: 10px; background-color: #f9fafb; border-top: 1px solid ${primaryColor}; }
        .footer > div { display: table-cell; width: 50%; padding: 12px; vertical-align: bottom; }
        .sign-box { text-align: right; padding-top: 40px; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header-title">TAX INVOICE</div>
        
        <div class="grid-2">
          <div>
            ${company.logoUrl ? (isBw ? `<img src="${company.logoUrl}" style="max-height: 70px; max-width: 180px; object-fit: contain; display: block; margin-bottom: 12px; filter: grayscale(100%);" />` : `<img src="${company.logoUrl}" style="max-height: 70px; max-width: 180px; object-fit: contain; display: block; margin-bottom: 12px;" />`) : `<h2 style="color: ${primaryColor}; margin: 0 0 10px 0; font-size: 20px;">${company.companyName}</h2>`}
            ${company.logoUrl ? `<div class="font-bold" style="font-size: 14px; color: ${primaryColor}; margin-bottom: 4px;">${company.companyName}</div>` : ''}
            <div style="color: ${muteColor};">${company.address}</div>
            ${company.stateName ? `<div style="color: ${muteColor};">State Name: ${company.stateName}, Code: ${company.stateCode}</div>` : ''}
            <div style="margin-top: 4px;">GSTIN/UIN: <span class="font-bold" style="color: ${primaryColor};">${company.gstin}</span></div>
            ${company.email ? `<div style="color: ${muteColor};">E-Mail: ${company.email}</div>` : ''}
          </div>
          <div style="padding: 0;">
            <div class="grid-2" style="border-bottom: none;">
              <div style="border-bottom: 1px solid #e5e7eb;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Invoice No.</div>
                <div class="font-bold" style="font-size: 14px; color: ${textColor};">${invoice.invoiceNumber}</div>
              </div>
              <div style="border-bottom: 1px solid #e5e7eb; border-right: none;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Dated</div>
                <div class="font-bold" style="color: ${textColor};">${new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</div>
              </div>
            </div>
            <div class="grid-2" style="border-bottom: none;">
              <div style="border-bottom: 1px solid #e5e7eb;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Delivery Note</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.deliveryNote || '-'}</div>
              </div>
              <div style="border-bottom: 1px solid #e5e7eb; border-right: none;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Mode/Terms of Payment</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.paymentTerms || '-'}</div>
              </div>
            </div>
            <div class="grid-2" style="border-bottom: none;">
              <div style="border-bottom: 1px solid #e5e7eb;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Reference No. & Date</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.referenceNo || '-'} ${invoice.referenceDate || ''}</div>
              </div>
              <div style="border-bottom: 1px solid #e5e7eb; border-right: none;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Other References</div>
                <div class="font-bold" style="color: ${textColor};">-</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-2" style="border-bottom: none;">
          <div style="border-bottom: 1px solid #e5e7eb;">
            <div style="font-size: 10px; color: ${primaryColor}; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Buyer (Bill to)</div>
            <div class="font-bold" style="font-size: 13px; color: ${textColor};">${invoice.buyerName || invoice.customer.name}</div>
            <div style="color: ${muteColor};">${invoice.buyerAddress || invoice.customer.address || '-'}</div>
            <div style="margin-top: 4px;">GSTIN/UIN: <span class="font-bold" style="color: ${textColor};">${invoice.buyerGstin || invoice.customer.gstin || '-'}</span></div>
            ${invoice.buyerState ? `<div style="color: ${muteColor};">State Name: ${invoice.buyerState}, Code: ${invoice.buyerStateCode || ''}</div>` : ''}
          </div>
          <div style="padding: 0;">
            <div class="grid-2" style="border-bottom: none;">
              <div style="border-bottom: 1px solid #e5e7eb;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Buyer's Order No.</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.buyersOrderNo || '-'}</div>
              </div>
              <div style="border-bottom: 1px solid #e5e7eb; border-right: none;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Dated</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.buyersOrderDate || '-'}</div>
              </div>
            </div>
            <div class="grid-2" style="border-bottom: none;">
              <div style="border-bottom: 1px solid #e5e7eb;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Dispatch Doc No.</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.dispatchDocNo || '-'}</div>
              </div>
              <div style="border-bottom: 1px solid #e5e7eb; border-right: none;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Delivery Note Date</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.dispatchDocDate || '-'}</div>
              </div>
            </div>
            <div class="grid-2" style="border-bottom: none;">
              <div style="border-bottom: 1px solid #e5e7eb;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Dispatched through</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.dispatchedThrough || '-'}</div>
              </div>
              <div style="border-bottom: 1px solid #e5e7eb; border-right: none;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Destination</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.destination || '-'}</div>
              </div>
            </div>
            <div class="grid-2" style="border-bottom: none;">
              <div style="border-bottom: 1px solid #e5e7eb;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Bill of Lading/LR-RR No.</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.billOfLading || '-'}</div>
              </div>
              <div style="border-bottom: 1px solid #e5e7eb; border-right: none;">
                <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Motor Vehicle No.</div>
                <div class="font-bold" style="color: ${textColor};">${invoice.snapshotVehicleNumber || invoice.vehicle?.vehicleNumber || '-'}</div>
              </div>
            </div>
          </div>
        </div>
        
        ${invoice.consigneeName ? `
        <div class="grid-2">
          <div>
            <div style="font-size: 10px; color: ${primaryColor}; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Consignee (Ship to)</div>
            <div class="font-bold" style="font-size: 13px; color: ${textColor};">${invoice.consigneeName}</div>
            <div style="color: ${muteColor};">${invoice.consigneeAddress || '-'}</div>
            <div style="margin-top: 4px;">GSTIN/UIN: <span class="font-bold" style="color: ${textColor};">${invoice.consigneeGstin || '-'}</span></div>
            ${invoice.consigneeState ? `<div style="color: ${muteColor};">State Name: ${invoice.consigneeState}, Code: ${invoice.consigneeStateCode || ''}</div>` : ''}
          </div>
          <div>
             <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Terms of Delivery</div>
             <div class="font-bold" style="color: ${textColor};">${invoice.termsOfDelivery || '-'}</div>
          </div>
        </div>
        ` : `
        <div class="border-b p-2">
           <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Terms of Delivery</div>
           <div class="font-bold" style="color: ${textColor};">${invoice.termsOfDelivery || '-'}</div>
        </div>
        `}

        <div class="items-container">
          <table class="items-table" style="border-bottom: 1px solid #1e3a8a;">
            <thead>
              <tr>
                <th style="width: 5%;">Sl No.</th>
                <th style="width: 35%;">Description of Goods</th>
                <th style="width: 10%;">HSN/SAC</th>
                <th style="width: 10%; text-align: right;">Quantity</th>
                <th style="width: 15%; text-align: right;">Rate</th>
                <th style="width: 10%; text-align: center;">per</th>
                <th style="width: 15%; text-align: right; border-right: none;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item, index) => `
                <tr class="${index === invoice.items.length - 1 ? 'last-row' : ''}">
                  <td class="text-center">${index + 1}</td>
                  <td class="font-bold" style="color: ${textColor};">${item.materialName || item.material?.name || '-'}</td>
                  <td style="color: ${muteColor};">${item.hsnCode || item.material?.hsnCode || '-'}</td>
                  <td class="text-right font-bold" style="color: ${textColor};">${invoice.invoiceType === 'IRON_SCRAP' ? (item.quantity / 1000).toFixed(2) : item.quantity.toFixed(2)}</td>
                  <td class="text-right">₹${item.rate.toFixed(2)}</td>
                  <td class="text-center text-xs" style="color: ${labelColor};">${item.unit || item.material?.unit || ''}</td>
                  <td class="text-right font-bold" style="color: ${textColor};">₹${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="totals-grid">
          <div class="totals-left">
            <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase; margin-bottom: 4px;">Amount Chargeable (in words)</div>
            <div class="font-bold" style="font-size: 13px; color: ${primaryColor};">${amountInWords}</div>
          </div>
          <div class="totals-right p-0">
            <table class="totals-table">
              <tr>
                <td style="color: ${muteColor};">Taxable Value</td>
                <td class="text-right font-bold" style="color: ${textColor};">₹${invoice.subTotal.toFixed(2)}</td>
              </tr>
              ${Object.values(taxSummary).some(t => t.cgstAmount > 0) ? `
              <tr>
                <td style="color: ${muteColor};">CGST</td>
                <td class="text-right">₹${Object.values(taxSummary).reduce((a,b)=>a+b.cgstAmount,0).toFixed(2)}</td>
              </tr>
              ` : ''}
              ${Object.values(taxSummary).some(t => t.sgstAmount > 0) ? `
              <tr>
                <td style="color: ${muteColor};">SGST</td>
                <td class="text-right">₹${Object.values(taxSummary).reduce((a,b)=>a+b.sgstAmount,0).toFixed(2)}</td>
              </tr>
              ` : ''}
              ${Object.values(taxSummary).some(t => t.igstAmount > 0) ? `
              <tr>
                <td style="color: ${muteColor};">IGST</td>
                <td class="text-right">₹${Object.values(taxSummary).reduce((a,b)=>a+b.igstAmount,0).toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr style="background-color: ${headerBgColor};">
                <td class="font-bold" style="color: ${primaryColor}; font-size: 14px;">Grand Total</td>
                <td class="text-right font-bold" style="color: ${primaryColor}; font-size: 14px;">₹${invoice.grandTotal.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>

        <div class="border-b" style="padding: 10px;">
          <table class="tax-table">
            <thead>
              <tr>
                <th rowspan="2" style="vertical-align: middle;">HSN/SAC</th>
                <th rowspan="2" style="vertical-align: middle;">Taxable Value</th>
                <th colspan="2">CGST</th>
                <th colspan="2">SGST</th>
                <th rowspan="2" style="vertical-align: middle;">Total Tax Amount</th>
              </tr>
              <tr>
                <th>Rate</th>
                <th>Amount</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(taxSummary).map(hsn => {
                const t = taxSummary[hsn];
                return `
                  <tr>
                    <td style="text-align: left;">${hsn}</td>
                    <td>₹${t.taxable.toFixed(2)}</td>
                    <td>${t.cgstRate}%</td>
                    <td>₹${t.cgstAmount.toFixed(2)}</td>
                    <td>${t.sgstRate}%</td>
                    <td>₹${t.sgstAmount.toFixed(2)}</td>
                    <td class="font-bold">₹${t.totalTax.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="font-bold" style="background-color: #f9fafb;">
                <td style="text-align: right; color: ${primaryColor};">Total</td>
                <td>₹${Object.values(taxSummary).reduce((a,b)=>a+b.taxable,0).toFixed(2)}</td>
                <td></td>
                <td>₹${Object.values(taxSummary).reduce((a,b)=>a+b.cgstAmount,0).toFixed(2)}</td>
                <td></td>
                <td>₹${Object.values(taxSummary).reduce((a,b)=>a+b.sgstAmount,0).toFixed(2)}</td>
                <td style="color: ${primaryColor};">₹${Object.values(taxSummary).reduce((a,b)=>a+b.totalTax,0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 10px;">
            <div style="font-size: 10px; color: ${labelColor}; text-transform: uppercase;">Tax Amount (in words)</div>
            <div class="font-bold" style="font-size: 12px; color: ${textColor};">${taxInWords}</div>
          </div>
        </div>

        <div class="footer">
          <div style="width: 50%;">
            ${company.declaration ? `
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: bold; color: ${primaryColor}; text-transform: uppercase;">Declaration:</div>
              <div style="color: ${muteColor}; font-size: 10px; margin-top: 2px;">${company.declaration}</div>
            </div>
            ` : ''}
            ${company.bankDetails ? `
            <div>
              <div style="font-size: 10px; font-weight: bold; color: ${primaryColor}; text-transform: uppercase;">Bank Details:</div>
              <div style="color: ${muteColor}; font-size: 10px; margin-top: 2px; white-space: pre-wrap;">${company.bankDetails}</div>
            </div>
            ` : ''}
            
            ${company.showQrOnInvoice && company.upiId ? `
            <div style="margin-top: 15px; display: flex; align-items: center; gap: 10px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${company.upiId}&pn=${encodeURIComponent(company.companyName)}&am=${invoice.grandTotal.toFixed(2)}" style="width: 70px; height: 70px; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px;" />
              <div>
                <div style="font-size: 10px; font-weight: bold; color: ${primaryColor};">Scan to Pay via UPI</div>
                <div style="font-size: 9px; color: ${labelColor}; margin-top: 2px;">ID: ${company.upiId}</div>
              </div>
            </div>
            ` : ''}
          </div>
          <div class="sign-box" style="width: 50%; text-align: right; position: relative; padding-bottom: 10px;">
            <div class="font-bold" style="color: ${primaryColor}; margin-bottom: 4px;">For ${company.companyName}</div>
            
            <div style="display: flex; justify-content: flex-end; align-items: flex-end; gap: 20px; height: 60px; margin-bottom: 4px;">
              ${company.sealImageUrl ? (isBw ? `<img src="${company.sealImageUrl}" style="max-height: 60px; max-width: 60px; object-fit: contain; opacity: 0.9; filter: grayscale(100%);" />` : `<img src="${company.sealImageUrl}" style="max-height: 60px; max-width: 60px; object-fit: contain; opacity: 0.9;" />`) : `<div style="height: 60px; width: 60px;"></div>`}
              ${company.signatureImageUrl ? (isBw ? `<img src="${company.signatureImageUrl}" style="max-height: 60px; max-width: 120px; object-fit: contain; filter: grayscale(100%);" />` : `<img src="${company.signatureImageUrl}" style="max-height: 60px; max-width: 120px; object-fit: contain;" />`) : `<div style="height: 60px; width: 120px;"></div>`}
            </div>

            <div style="color: ${textColor}; font-weight: bold;">${company.authSignatoryName || 'Authorised Signatory'}</div>
            ${company.authSignatoryDesignation ? `<div style="color: ${labelColor}; font-size: 10px;">${company.authSignatoryDesignation}</div>` : ''}
          </div>
        </div>

      </div>
      <div class="text-center" style="margin-top: 12px; font-size: 10px; color: #9ca3af;">SUBJECT TO LOCAL JURISDICTION</div>
      <div class="text-center" style="font-size: 10px; color: #9ca3af;">This is a Computer Generated Invoice</div>
    </body>
    </html>
  `;

  return htmlContent;
};
