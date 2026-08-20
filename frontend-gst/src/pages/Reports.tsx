import { useState, useEffect, useMemo } from 'react';
import { Download, TrendingUp, CreditCard, Filter, Calendar, FileText, Search, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Reports = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Date Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Initial Fetch
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/invoices');
      const data = res.data.data || res.data;
      const finalized = data.filter((i: any) => i.status === 'FINALIZED');
      setInvoices(finalized);
      applyFilters(finalized);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (dataToFilter = invoices) => {
    setIsLoading(true);
    setTimeout(() => {
      if (!startDate || !endDate) {
        setFilteredData(dataToFilter);
      } else {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        const filtered = dataToFilter.filter(inv => {
          const invDate = new Date(inv.date);
          return invDate >= start && invDate <= end;
        });
        setFilteredData(filtered);
      }
      setHasSearched(true);
      setIsLoading(false);
    }, 300); // Simulate network delay for UX
  };

  const resetFilters = () => {
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    setHasSearched(false);
    setTimeout(() => {
      applyFilters(invoices);
    }, 0);
  };

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
    }, {} as Record<string, any>);
    
    return Object.values(grouped).sort((a: any, b: any) => b.sales - a.sales).slice(0, 10); // Top 10
  }, [filteredData]);

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = ['Invoice No', 'Date', 'Customer', 'Taxable Amount', 'GST Amount', 'Total Amount', 'Status'];
    const rows = filteredData.map(i => [
      i.invoiceNumber,
      i.date ? i.date.split('T')[0] : '',
      i.customer?.name || i.buyerName || '',
      i.subTotal,
      i.taxTotal,
      i.grandTotal,
      i.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/reports/export-sales?startDate=${startDate}&endDate=${endDate}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_report_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Excel export failed', error);
      alert('Failed to generate Excel report. Please use the CSV export as a fallback.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Analyze your business performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button 
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              <Download size={16} /> Export (CSV)
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
            >
              <Download size={16} /> Export (Excel)
            </button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-gray-700 font-medium">
          <Filter size={18} />
          <h2>Report Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date From</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date To</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="lg:col-span-2 flex items-center justify-end gap-3 h-[42px]">
            <button 
              onClick={resetFilters}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-white text-gray-600 border border-gray-300 px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} /> Reset
            </button>
            <button 
              onClick={() => applyFilters(invoices)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Generating Report Data...</p>
        </div>
      ) : hasSearched && filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <AlertCircle size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No Records Found</h3>
          <p className="text-gray-500">There are no invoices matching the selected filters.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[140px]">
              <div className="flex items-center gap-3 text-blue-600 mb-4">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <TrendingUp size={20} />
                </div>
                <h3 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">Total Sales</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-auto truncate">₹ {stats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[140px]">
              <div className="flex items-center gap-3 text-green-600 mb-4">
                <div className="bg-green-50 p-2 rounded-lg">
                  <CreditCard size={20} />
                </div>
                <h3 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">GST Collected</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-auto truncate">₹ {stats.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[140px]">
              <div className="flex items-center gap-3 text-purple-600 mb-4">
                <div className="bg-purple-50 p-2 rounded-lg">
                  <FileText size={20} />
                </div>
                <h3 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">Total Invoices</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-auto">{stats.count}</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[140px]">
              <div className="flex items-center gap-3 text-amber-600 mb-4">
                <div className="bg-amber-50 p-2 rounded-lg">
                  <TrendingUp size={20} />
                </div>
                <h3 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">Avg Value</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-auto truncate">₹ {stats.avgValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          
          {/* Charts Area */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Top Customers by Revenue</h2>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerChartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} angle={-25} textAnchor="end" height={80} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                    formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="sales" name="Taxable Value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="tax" name="GST" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
