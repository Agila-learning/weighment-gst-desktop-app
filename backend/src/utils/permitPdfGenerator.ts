import puppeteer from 'puppeteer';

export const generatePermitHtml = (permit: any, template: any) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Permit Card</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap');
      body {
        font-family: 'Inter', sans-serif;
        margin: 0;
        padding: 0;
        color: #000;
        font-size: 10px;
      }
      .page-container {
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        box-sizing: border-box;
      }
      .card-section {
        margin-bottom: 40px;
      }
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 5px;
      }
      .header-title {
        text-align: center;
        font-weight: bold;
        font-size: 12px;
        flex-grow: 1;
      }
      .header-right {
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        font-weight: bold;
        font-size: 10px;
      }
      .qr-img {
        width: 50px;
        height: 50px;
        margin-bottom: 5px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border: 1.5px solid #000;
      }
      th, td {
        border: 1px solid #000;
        padding: 4px 6px;
        text-align: left;
        vertical-align: top;
        line-height: 1.4;
      }
      .label {
        font-weight: bold;
        width: 25%;
      }
      .value {
        font-weight: bold;
        width: 25%;
      }
      .value-text {
        font-weight: bold;
      }
      .signature-cell {
        text-align: left;
        height: 35px;
      }
      .signature-img {
        max-height: 30px;
      }
    </style>
  </head>
  <body>
    <div class="page-container">
      ${['Original', 'Duplicate'].map((type, index) => `
      <div class="card-section" ${index === 1 ? 'style="margin-top: 100px;"' : ''}>
        <div class="header-container">
          <div class="header-title">${type}</div>
          <div class="header-right">
            ${template?.qrImageUrl ? `<img class="qr-img" src="${template.qrImageUrl}" alt="QR" />` : '<div style="width:50px;height:50px;"></div>'}
            <div>Date & Time of Dispatch : ${permit.date ? new Date(permit.date).toLocaleDateString('en-GB').replace(/\//g, '-') : ''} ${permit.dispatchTime || ''}</div>
          </div>
        </div>
        
        <table>
          <tr>
            <td class="label">Registration Number :</td>
            <td class="value">${template?.registrationNumber || ''}</td>
            <td class="label">Location of the Stockyard :</td>
            <td class="value">${template?.stockyardLocation || ''}</td>
          </tr>
          <tr>
            <td colspan="2" rowspan="3" class="label">
              Name and Address of the Register Holder :<br/>
              <span class="value-text">
              ${template?.registerHolderName || ''}
              </span>
            </td>
            <td class="label">SF.No / Extent :</td>
            <td class="value">${template?.stockyardSfNo || ''}</td>
          </tr>
          <tr>
            <td class="label">Village :</td>
            <td class="value">${template?.stockyardVillage || ''}</td>
          </tr>
          <tr>
            <td class="label">Taluk :</td>
            <td class="value">${template?.stockyardTaluk || ''}</td>
          </tr>
          <tr>
            <td class="label">Name of Mineral / Mineral Products :</td>
            <td class="value">${permit.materialName || ''}</td>
            <td class="label">District :</td>
            <td class="value">${template?.stockyardDistrict || ''}</td>
          </tr>
          <tr>
            <td class="label">Quantity(in MT) :</td>
            <td class="value">${permit.quantity || ''}</td>
            <td class="label">Validity of Stockyard :</td>
            <td class="value">${template?.stockyardValidity || ''}</td>
          </tr>
          <tr>
            <td class="label">Bulk Transit Pass No :</td>
            <td class="value">${permit.bulkTransitPassNumber || ''}</td>
            <td class="label">Security Paper Serial No :</td>
            <td class="value">${permit.securityPaperNumber || ''}</td>
          </tr>
          <tr>
            <td class="label">Vehicle No :</td>
            <td class="value">${permit.vehicleNumber || ''}</td>
            <td class="label">Transit Pass Serial No :</td>
            <td class="value">${permit.transitPassNumber || ''}</td>
          </tr>
          <tr>
            <td class="label">Approximate Distance :</td>
            <td class="value">${permit.approximateDistance || ''}</td>
            <td class="label">Name of the Purchaser :</td>
            <td class="value">${permit.purchaserName || ''}</td>
          </tr>
          <tr>
            <td class="label">Time Start :</td>
            <td class="value">${permit.timeStart || ''}</td>
            <td colspan="2" rowspan="3" class="label">
              Address of the Purchaser :<br/>
              <span class="value-text">
              ${permit.purchaserAddress || ''}
              </span>
            </td>
          </tr>
          <tr>
            <td class="label">Time End :</td>
            <td class="value">${permit.timeEnd || ''}</td>
          </tr>
          <tr>
            <td class="label">Name of Vehicle Driver :</td>
            <td class="value">${permit.driverName || ''}</td>
          </tr>
          <tr>
            <td class="label">Destination and State :</td>
            <td class="value">${permit.purchaserDestination || ''}, ${permit.purchaserState || ''}</td>
            <td class="label">Signature of AD / DD :</td>
            <td class="signature-cell">
               ${template?.sealImageUrl ? `<img class="signature-img" src="${template.sealImageUrl}" />` : ''}
            </td>
          </tr>
          <tr>
            <td class="label" style="height: 40px; vertical-align: middle;">Driver Signature :</td>
            <td class="signature-cell"></td>
            <td class="label" style="vertical-align: middle;">Registree Signature :</td>
            <td class="signature-cell" style="vertical-align: middle;">
               ${template?.signatureImageUrl ? `<img class="signature-img" src="${template.signatureImageUrl}" />` : ''}
            </td>
          </tr>
        </table>
      </div>
      `).join('')}
    </div>
  </body>
  </html>
  `;
};

export const generatePermitPdf = async (html: string) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    await browser.close();
    throw error;
  }
};
