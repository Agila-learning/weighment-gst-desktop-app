import apiClient from '../api/client';

export async function fetchInvoicePdf(invoiceId: string): Promise<{ blob: Blob, blobUrl: string, buffer: ArrayBuffer }> {
  const pdfRes = await apiClient.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
  let blob = pdfRes.data;

  // Check if the backend fell back to returning HTML instead of a real PDF
  // (e.g. if Puppeteer failed on Render)
  if (blob.type === 'text/html' || blob.type.includes('html')) {
    const text = await blob.text();
    // Use our local Electron IPC to generate the PDF instead
    const ipcRenderer = (window as any).ipcRenderer;
    if (ipcRenderer) {
      const result = await ipcRenderer.invoke('generate-pdf', text);
      if (result.success) {
        blob = new Blob([result.buffer], { type: 'application/pdf' });
      } else {
        throw new Error('Local PDF Generation failed: ' + result.error);
      }
    } else {
      throw new Error('PDF Generation failed on server and no local IPC found.');
    }
  } else {
    // If it's already a valid PDF from the backend, just ensure the MIME type is correct
    blob = new Blob([blob], { type: 'application/pdf' });
  }

  const blobUrl = URL.createObjectURL(blob);
  const buffer = await blob.arrayBuffer();

  return { blob, blobUrl, buffer };
}
