import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Activity } from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [page, searchTerm]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      if (!ipcRenderer) return;

      let query = "SELECT * FROM audit_logs";
      let countQuery = "SELECT count(*) as count FROM audit_logs";
      let conditions: string[] = [];
      let params: any[] = [];

      if (searchTerm) {
        conditions.push("(action LIKE ? OR entity LIKE ? OR details LIKE ?)");
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
      }

      if (conditions.length > 0) {
        const whereClause = " WHERE " + conditions.join(" AND ");
        query += whereClause;
        countQuery += whereClause;
      }

      query += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
      
      const countRes = await ipcRenderer.invoke('db-query', countQuery, params);
      const res = await ipcRenderer.invoke('db-query', query, [...params, limit, (page - 1) * limit]);
      
      if (res.success && countRes.success) {
        setLogs(res.data);
        setTotal(countRes.data[0].count);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">System Audit Log</h1>
        <button 
          onClick={fetchLogs}
          className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
        >
          <RefreshCw size={18} className="mr-2" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="relative w-96">
            <input 
              type="text"
              placeholder="Search actions, entities, details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-slate-400">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-slate-500 flex-col space-y-4">
              <Activity size={48} className="text-slate-300" />
              <p>No audit logs found.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs sticky top-0 border-b border-slate-200 shadow-sm z-10">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3 w-1/2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{log.userId || 'SYSTEM'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        log.action === 'DELETE' || log.action === 'CANCEL' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{log.entity}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.entityId}</td>
                    <td className="px-4 py-3 whitespace-normal break-words text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
