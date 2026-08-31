import api from '../services/api';

export const fetchWeighmentSlipPdf = async (weighmentId: string) => {
  try {
    const res = await api.get(`/weighments/${weighmentId}/slip-pdf`, {
      responseType: 'arraybuffer',
      headers: {
        Accept: 'application/pdf, text/html'
      }
    });

    const isFallbackHtml = res.headers['x-fallback-html'] === 'true' || String(res.headers['content-type'] || '').includes('text/html');
    const blobType = isFallbackHtml ? 'text/html' : 'application/pdf';
    
    const blob = new Blob([res.data], { type: blobType });
    const blobUrl = URL.createObjectURL(blob);

    return {
      buffer: isFallbackHtml ? null : res.data,
      blobUrl,
      blob
    };
  } catch (error) {
    console.error('Error fetching PDF:', error);
    throw error;
  }
};
