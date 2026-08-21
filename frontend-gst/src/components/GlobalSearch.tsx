import { useState, useEffect, useRef } from 'react';
import { Search, X, Users, Truck, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch = ({ isOpen, onClose }: GlobalSearchProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ customers: any[], vehicles: any[], invoices: any[] }>({ customers: [], vehicles: [], invoices: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ customers: [], vehicles: [], invoices: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults({ customers: [], vehicles: [], invoices: [] });
        return;
      }
      setLoading(true);
      try {
        const res = await apiClient.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    };
    
    const debounceTimer = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-start justify-center pt-20">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <Search className="text-gray-400 mr-3" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 outline-none text-lg bg-transparent"
            placeholder="Search customers, vehicles, or invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
          ) : query.trim() && Object.values(results).every(arr => arr.length === 0) ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-4">
              {results.customers.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customers</div>
                  {results.customers.map((c) => (
                    <button 
                      key={c.id} 
                      onClick={() => navigateTo('/customers')} 
                      className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Users size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.gstin || c.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {results.vehicles.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicles</div>
                  {results.vehicles.map((v) => (
                    <button 
                      key={v.id} 
                      onClick={() => navigateTo('/vehicles')} 
                      className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                        <Truck size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{v.vehicleNumber}</div>
                        <div className="text-xs text-gray-500">Tare: {v.tareWeight} kg</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {results.invoices.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoices</div>
                  {results.invoices.map((inv) => (
                    <button 
                      key={inv.id} 
                      onClick={() => navigateTo('/invoices')} 
                      className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">{inv.customer?.name} • {inv.vehicle?.vehicleNumber}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 border-t border-gray-100 flex justify-between">
          <span>Search functionality powered by global index</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
