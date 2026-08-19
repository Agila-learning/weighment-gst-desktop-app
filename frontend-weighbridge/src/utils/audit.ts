export async function logAudit(action: string, entity: string, entityId: string, details: string) {
  try {
    const ipcRenderer = (window as any).ipcRenderer;
    if (!ipcRenderer) return;
    
    const id = "AUDIT-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const userId = "ADMIN"; // Placeholder for actual user system
    const createdAt = new Date().toISOString();

    const q = `INSERT INTO audit_logs (id, userId, action, entity, entityId, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await ipcRenderer.invoke('db-query', q, [id, userId, action, entity, entityId, details, createdAt]);
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
