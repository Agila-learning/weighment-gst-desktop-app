import { useState, useEffect } from 'react';
import { Download, TrendingUp, CreditCard, Filter, Calendar, FileText, Search, RefreshCw, Loader2, AlertCircle, PieChart as PieChartIcon, IndianRupee } from 'lucide-react';
import apiClient from '../api/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const Reports = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [materialData, setMaterialData] = useState<any[]>([]);
  const [taxData, setTaxData] = useState<any>(null);
  const [outstandingData, setOutstandingData] = useState<any[]>([]);
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'tax' | 'outstanding'>('sales');
  
  // Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/invoices');
      const data = res.data.data.filter((inv: any) => inv.status === 'FINALIZED');
      setInvoices(data);
      applyFilters(data);
    } catch (error) {
      console.error("Error fetching reports data", error);
      setIsLoading(false);
    }
  };

  const applyFilters = (dataToFilter = invoices) => {
    setIsLoading(true);
    setTimeout(() => {
      if (!startDate && !endDate) {
        setFilteredData(dataToFilter);
      } else {
        const start = new Date(startDate || '2000-01-01');
        const end = new Date(endDate || '2100-01-01');
        end.setHours(23, 59, 59);
        
        const filtered = dataToFilter.filter(inv => {
          const invDate = new Date(inv.date);
          return invDate >= start && invDate <= end;
        });
        setFilteredData(filtered);
      }
      
      // Fetch material analysis
      apiClient.get(`/reports/material-analysis?startDate=${startDate}&endDate=${endDate}`)
        .then(res => setMaterialData(res.data.data))
        .catch(err => console.error("Error fetching material analysis", err));
        
      // Fetch tax summary
      apiClient.get(`/reports/tax-summary?startDate=${startDate}&endDate=${endDate}`)
        .then(res => setTaxData(res.data.data))
        .catch(err => console.error("Error fetching tax summary", err));
        
      // Fetch outstanding data
      apiClient.get(`/reports/outstanding`)
        .then(res => setOutstandingData(res.data.data))
        .catch(err => console.error("Error fetching outstanding data", err));
        
      setHasSearched(true);
      setIsLoading(false);
    }, 300);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilteredData(invoices);
    applyFilters(invoices);
  };

  // KPI Calculations
  const stats = {
    totalSales: filteredData.reduce((acc, curr) => acc + (curr.totalTaxableValue || 0), 0),
    totalGst: filteredData.reduce((acc, curr) => acc + (curr.totalTaxAmount || 0), 0),
    count: filteredData.length,
    avgValue: filteredData.length ? filteredData.reduce((acc, curr) => acc + curr.grandTotal, 0) / filteredData.length : 0
  };

  // Group by customer
  const customerSales: Record<string, any> = {};
  filteredData.forEach(inv => {
    const custName = inv.customer?.name || inv.buyerName || 'Unknown';
    if (!customerSales[custName]) customerSales[custName] = { name: custName, sales: 0, tax: 0 };
    customerSales[custName].sales += (inv.totalTaxableValue || 0);
    customerSales[custName].tax += (inv.totalTaxAmount || 0);
  });
  
  const customerChartData = Object.values(customerSales)
    .sort((a: any, b: any) => b.sales - a.sales)
    .slice(0, 10);
    
  // Group by date for Daily Trend
  const dailySales: Record<string, any> = {};
  filteredData.forEach(inv => {
    const dStr = format(new Date(inv.date), 'dd MMM');
    if (!dailySales[dStr]) dailySales[dStr] = { date: dStr, sales: 0 };
    dailySales[dStr].sales += inv.grandTotal;
  });
  const dailyChartData = Object.values(dailySales).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Advanced insights and tax reporting</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            <Download size={18} /> Export Excel
          </button>
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
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mt-6">
        <button 
          onClick={() => setActiveTab('sales')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'sales' ? 'bg-white text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'}`}
        >
          <TrendingUp size={16} /> Sales Analytics
        </button>
        <button 
          onClick={() => setActiveTab('tax')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'tax' ? 'bg-white text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'}`}
        >
          <PieChartIcon size={16} /> Tax & GST
        </button>
        <button 
          onClick={() => setActiveTab('outstanding')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'outstanding' ? 'bg-white text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'}`}
        >
          <CreditCard size={16} /> Outstanding (Aging)
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Generating Report Data...</p>
        </div>
      ) : hasSearched && filteredData.length === 0 && activeTab === 'sales' ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <AlertCircle size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No Records Found</h3>
          <p className="text-gray-500">There are no invoices matching the selected filters.</p>
        </div>
      ) : (
        <>
          {activeTab === 'sales' && (
            <div className="space-y-6">
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
                      <IndianRupee size={20} />
                    </div>
                    <h3 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">Total GST</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mt-auto truncate">₹ {stats.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
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

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[400px]">
                  <h2 className="text-lg font-semibold text-gray-800 mb-6">Daily Sales Trend</h2>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyChartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                        <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                        <Line type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[400px]">
                  <h2 className="text-lg font-semibold text-gray-800 mb-6">Material Revenue Analysis</h2>
                  <div className="flex-1 w-full min-h-0">
                    {materialData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={materialData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="revenue"
                            nameKey="materialName"
                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            labelLine={true}
                          >
                            {materialData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => `₹ ${Number(value).toLocaleString('en-IN')}`} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">No material data found</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[450px]">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Top Customers by Revenue</h2>
                <div className="flex-1 w-full min-h-0">
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
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <PieChartIcon className="text-blue-500" /> GST Collection Summary
                </h2>
                
                {taxData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-500 uppercase">Taxable Value</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">₹ {taxData.totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
                      <p className="text-sm font-semibold text-blue-600 uppercase">CGST Collected</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">₹ {taxData.totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-5 border border-green-100">
                      <p className="text-sm font-semibold text-green-600 uppercase">SGST Collected</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">₹ {taxData.totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-5 border border-purple-100">
                      <p className="text-sm font-semibold text-purple-600 uppercase">IGST Collected</p>
                      <p className="text-2xl font-bold text-purple-900 mt-2">₹ {taxData.totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">Loading tax data...</div>
                )}
                
                {taxData && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center bg-gray-800 text-white p-6 rounded-xl shadow-inner">
                      <div>
                        <p className="text-gray-300 text-sm uppercase tracking-wider font-semibold">Total GST Payable</p>
                        <p className="text-sm text-gray-400 mt-1">For the selected period ({startDate} to {endDate})</p>
                      </div>
                      <p className="text-4xl font-bold tracking-tight">₹ {taxData.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'outstanding' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <CreditCard className="text-red-500" size={20} /> Customer Aging & Outstanding
                  </h2>
                  <p className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                    Total: ₹ {outstandingData.reduce((acc, curr) => acc + curr.totalOutstanding, 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-gray-500 border-b border-gray-200 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Customer</th>
                        <th className="px-6 py-4 font-semibold">Contact</th>
                        <th className="px-6 py-4 font-semibold">Unpaid Invoices</th>
                        <th className="px-6 py-4 text-right font-semibold">Total Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {outstandingData.map((cust) => (
                        <tr key={cust.customerId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">{cust.customerName}</td>
                          <td className="px-6 py-4 text-gray-600">{cust.customerPhone || '-'}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {cust.invoices.slice(0, (expandedInvoices[cust.customerId] ? cust.invoices.length : 3)).map((inv: any) => (
                                <span key={inv.id} className="text-xs text-gray-500">
                                  {inv.invoiceNumber} (₹{inv.balance.toLocaleString('en-IN')})
                                </span>
                              ))}
                              {cust.invoices.length > 3 && !expandedInvoices[cust.customerId] && (
                                <button 
                                  onClick={() => setExpandedInvoices(prev => ({...prev, [cust.customerId]: true}))}
                                  className="text-xs font-semibold text-blue-500 hover:text-blue-700 text-left"
                                >
                                  +{cust.invoices.length - 3} more...
                                </button>
                              )}
                              {cust.invoices.length > 3 && expandedInvoices[cust.customerId] && (
                                <button 
                                  onClick={() => setExpandedInvoices(prev => ({...prev, [cust.customerId]: false}))}
                                  className="text-xs font-semibold text-blue-500 hover:text-blue-700 text-left"
                                >
                                  Show less
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-red-600">
                            ₹ {cust.totalOutstanding.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      {outstandingData.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                            Great! You have no outstanding invoices.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
