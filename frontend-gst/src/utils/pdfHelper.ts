import apiClient from '../api/client';

export async function fetchInvoicePdf(invoiceId: string): Promise<{ blob: Blob, blobUrl: string, buffer: ArrayBuffer }> {
  // Using native fetch instead of Axios for binary data to avoid Electron adapter corruption
  const url = `${apiClient.defaults.baseURL || 'http://localhost:3000/api'}/invoices/${invoiceId}/pdf`;
  const token = localStorage.getItem('token');
  
  const res = await fetch(url, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });

  if (!res.ok) {
    throw new Error(`Server returned ${res.status}: ${await res.text()}`);
  }

  const contentType = res.headers.get('content-type') || '';
  
  let blob: Blob;
  let buffer: ArrayBuffer;

  if (contentType.includes('text/html')) {
    const text = await res.text();
    const ipcRenderer = (window as any).ipcRenderer;
    if (ipcRenderer) {
      const result = await ipcRenderer.invoke('generate-pdf', text);
      if (result.success) {
        // Handle case where Buffer is serialized as { type: 'Buffer', data: [...] }
        const bufferData = result.buffer.data ? new Uint8Array(result.buffer.data) : result.buffer;
        buffer = bufferData;
        blob = new Blob([bufferData], { type: 'application/pdf' });
      } else {
        throw new Error('Local PDF Generation failed: ' + result.error);
      }
    } else {
      throw new Error('PDF Generation failed on server and no local IPC found.');
    }
  } else {
    blob = await res.blob();
    // Force the correct MIME type on the blob
    blob = new Blob([blob], { type: 'application/pdf' });
    buffer = await blob.arrayBuffer();
  }

  const blobUrl = URL.createObjectURL(blob);
  return { blob, blobUrl, buffer };
}
