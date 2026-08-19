import { useState, useEffect, useMemo } from 'react';
import { Download, TrendingUp, CreditCard, Filter, Calendar, FileText } from 'lucide-react';
import apiClient, { API_BASE_URL } from '../api/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Reports = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  
  // Date Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    apiClient.get('/invoices').then(res => {
      // Handle potential pagination
      const data = res.data.data || res.data;
      const finalized = data.filter((i: any) => i.status === 'FINALIZED');
      setInvoices(finalized);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) {
      setFilteredData(invoices);
      return;
    }
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const filtered = invoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= start && invDate <= end;
    });
    setFilteredData(filtered);
  }, [invoices, startDate, endDate]);

  const stats = useMemo(() => {
    return {
      totalSales: filteredData.reduce((sum, i) => sum + i.grandTotal, 0),
      totalTax: filteredData.reduce((sum, i) => sum + i.taxTotal, 0),
      count: filteredData.length,
      avgValue: filteredData.length > 0 ? (filteredData.reduce((sum, i) => sum + i.grandTotal, 0) / filteredData.length) : 0
    };
  }, [filteredData]);

  const customerChartData = useMemo(() => {
    const grouped = filteredData.reduce((acc, inv) => {
      const name = inv.customer?.name || inv.buyerName || 'Unknown';
      if (!acc[name]) acc[name] = { name, sales: 0, tax: 0 };
      acc[name].sales += inv.subTotal;
      acc[name].tax += inv.taxTotal;
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a: any, b: any) => b.sales - a.sales).slice(0, 10); // Top 10
  }, [filteredData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Analyze your business performance</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <Calendar size={18} className="text-gray-500 ml-2" />
          <input 
            type="date" 
            className="border-none outline-none text-sm text-gray-700 bg-transparent"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <span className="text-gray-400">to</span>
          <input 
            type="date" 
            className="border-none outline-none text-sm text-gray-700 bg-transparent mr-2"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="p-1.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
            title="Clear filters"
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <TrendingUp size={24} />
            <h3 className="font-semibold text-gray-700">Total Sales</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">₹ {stats.totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-green-600 mb-2">
            <CreditCard size={24} />
            <h3 className="font-semibold text-gray-700">GST Collected</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">₹ {stats.totalTax.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-purple-600 mb-2">
            <FileText size={24} />
            <h3 className="font-semibold text-gray-700">Invoices Generated</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.count}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><Download size={20} className="mr-2 text-blue-600" /> Export Data</h3>
          <p className="text-sm text-gray-500 mb-4">Download comprehensive Excel reports for the selected date range. Useful for accounting and GST filing.</p>
          <div className="space-y-3">
            <a href={`${API_BASE_URL}/reports/export-sales?startDate=${startDate}&endDate=${endDate}`} target="_blank" className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <FileText size={18} /> Export Detailed Sales Register (Excel)
            </a>
            <button className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium">
              <Download size={18} /> Export GSTR-1 Format (Beta)
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Top Customers by Revenue</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerChartData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} angle={-15} textAnchor="end" height={60} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="sales" name="Taxable Value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="tax" name="GST" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Key Insights</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-sm text-blue-800 font-medium mb-1">Average Invoice Value</div>
              <div className="text-2xl font-bold text-blue-900">₹ {stats.avgValue.toFixed(2)}</div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="text-sm text-green-800 font-medium mb-1">Total GST Liability</div>
              <div className="text-2xl font-bold text-green-900">₹ {stats.totalTax.toFixed(2)}</div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="text-sm text-purple-800 font-medium mb-1">Active Customers (Period)</div>
              <div className="text-2xl font-bold text-purple-900">{customerChartData.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
