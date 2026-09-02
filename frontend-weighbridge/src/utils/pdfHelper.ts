import api from '../services/api';

export const fetchWeighmentSlipPdf = async (weighmentId: string) => {
  try {
    const url = `${api.defaults.baseURL || 'https://weighment-gst-desktop-app.onrender.com/api'}/weighments/${weighmentId}/slip-pdf`;
    const token = localStorage.getItem('token');
    
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${await res.text()}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const isFallbackHtml = res.headers.get('x-fallback-html') === 'true' || contentType.includes('text/html');
    
    let blob: Blob;
    let buffer: ArrayBuffer | null = null;
    let blobUrl: string;

    if (isFallbackHtml) {
      const text = await res.text();
      const ipcRenderer = (window as any).ipcRenderer;
      if (ipcRenderer) {
        const result = await ipcRenderer.invoke('generate-pdf', text);
        if (result.success) {
          const bufferData = result.buffer.data ? new Uint8Array(result.buffer.data) : result.buffer;
          buffer = bufferData;
          blob = new Blob([bufferData], { type: 'application/pdf' });
        } else {
          throw new Error('Local PDF Generation failed: ' + result.error);
        }
      } else {
        blob = new Blob([text], { type: 'text/html' });
      }
    } else {
      blob = await res.blob();
      blob = new Blob([blob], { type: 'application/pdf' });
      buffer = await blob.arrayBuffer();
    }

    blobUrl = URL.createObjectURL(blob);

    return {
      buffer,
      blobUrl,
      blob
    };
  } catch (error) {
    console.error('Error fetching PDF:', error);
    throw error;
  }
};

export async function fetchInvoicePdf(invoiceId: string) {
  try {
    const url = `${api.defaults.baseURL || 'https://weighment-gst-desktop-app.onrender.com/api'}/invoices/${invoiceId}/pdf`;
    const token = localStorage.getItem('token');
    
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${await res.text()}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const isFallbackHtml = res.headers.get('x-fallback-html') === 'true' || contentType.includes('text/html');
    
    let blob: Blob;
    let buffer: ArrayBuffer | null = null;
    let blobUrl: string;

    if (isFallbackHtml) {
      const text = await res.text();
      const ipcRenderer = (window as any).ipcRenderer;
      if (ipcRenderer) {
        const result = await ipcRenderer.invoke('generate-pdf', text);
        if (result.success) {
          const bufferData = result.buffer.data ? new Uint8Array(result.buffer.data) : result.buffer;
          buffer = bufferData;
          blob = new Blob([bufferData], { type: 'application/pdf' });
        } else {
          throw new Error('Local PDF Generation failed: ' + result.error);
        }
      } else {
        blob = new Blob([text], { type: 'text/html' });
      }
    } else {
      blob = await res.blob();
      blob = new Blob([blob], { type: 'application/pdf' });
      buffer = await blob.arrayBuffer();
    }

    blobUrl = URL.createObjectURL(blob);
    return { blob, blobUrl, buffer };
  } catch (error) {
    console.error('Error fetching Invoice PDF:', error);
    throw error;
  }
}
