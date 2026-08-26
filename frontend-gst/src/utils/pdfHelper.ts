import apiClient from '../api/client';

export async function fetchInvoicePdf(invoiceId: string): Promise<{ blob: Blob, blobUrl: string, buffer: ArrayBuffer }> {
  const pdfRes = await apiClient.get(`/invoices/${invoiceId}/pdf`, { responseType: 'arraybuffer' });
  const contentType = pdfRes.headers['content-type'] || '';
  
  let blob: Blob;
  let buffer = pdfRes.data;

  // Check if the backend fell back to returning HTML instead of a real PDF
  // (e.g. if Puppeteer failed on Render)
  if (contentType.includes('text/html')) {
    const text = new TextDecoder().decode(buffer);
    // Use our local Electron IPC to generate the PDF instead
    const ipcRenderer = (window as any).ipcRenderer;
    if (ipcRenderer) {
      const result = await ipcRenderer.invoke('generate-pdf', text);
      if (result.success) {
        buffer = result.buffer;
        blob = new Blob([result.buffer], { type: 'application/pdf' });
      } else {
        throw new Error('Local PDF Generation failed: ' + result.error);
      }
    } else {
      throw new Error('PDF Generation failed on server and no local IPC found.');
    }
  } else {
    // If it's already a valid PDF from the backend, just ensure the MIME type is correct
    blob = new Blob([buffer], { type: 'application/pdf' });
  }

  const blobUrl = URL.createObjectURL(blob);

  return { blob, blobUrl, buffer };
}
