import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Users, Box, Truck, FileText, Settings, BarChart, FileClock, Download, ChevronDown, ChevronRight, ChevronLeft, CreditCard, UserCircle2 } from 'lucide-react';

const Sidebar = () => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    'REPORTS': true,
    'DATA': true
  });
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleCategory = (title: string) => {
    setCollapsedCategories(prev => ({ ...prev, [title]: !prev[title] }));
  };
  const categories = [
    {
      title: 'MAIN',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard }
      ]
    },
    {
      title: 'MASTERS',
      items: [
        { name: 'Customers', path: '/customers', icon: Users },
        { name: 'Materials', path: '/materials', icon: Box },
        { name: 'Vehicles', path: '/vehicles', icon: Truck },
        { name: 'Drivers', path: '/drivers', icon: UserCircle2 },
      ]
    },
    {
      title: 'BILLING',
      items: [
        { name: 'Quick Bill', path: '/billing', icon: FileText },
        { name: 'Invoice Register', path: '/invoices', icon: FileClock },
        { name: 'Payments', path: '/payments', icon: CreditCard },
      ]
    },
    {
      title: 'REPORTS',
      items: [
        { name: 'Reports', path: '/reports', icon: BarChart },
      ]
    },
    {
      title: 'DATA',
      items: [
        { name: 'Import / Export', path: '/data-center', icon: Download },
      ]
    },
    {
      title: 'CONFIG',
      items: [
        { name: 'Settings', path: '/settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside className={`bg-blue-900 text-white flex flex-col shadow-lg transition-all duration-300 ${isMinimized ? 'w-20' : 'w-64'}`}>
      <div className="p-6 flex items-center justify-between">
        {!isMinimized && <h1 className="text-2xl font-bold tracking-wider">GST BILLING</h1>}
        <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/10 rounded">
          {isMinimized ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav className="flex-1 mt-2 overflow-y-auto pb-6 sidebar-menu">
        <ul className="space-y-4">
          {categories.map((category) => {
            const isCollapsed = collapsedCategories[category.title];
            return (
            <li key={category.title}>
              <button 
                onClick={() => toggleCategory(category.title)}
                className={`w-full flex items-center px-6 mb-1 text-xs font-semibold text-white/50 tracking-widest hover:text-white/80 transition-colors ${isMinimized ? 'justify-center' : 'justify-between'}`}
                title={category.title}
              >
                {!isMinimized && <span>{category.title}</span>}
                {!isMinimized && category.items.length > 1 ? (
                  isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />
                ) : null}
                {isMinimized && <div className="h-px w-8 bg-white/20 my-2" />}
              </button>
              
              {!isCollapsed && (
              <ul className="space-y-1 mt-2">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.name} className="px-4">
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                            isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          } ${isMinimized ? 'justify-center' : ''}`
                        }
                        title={item.name}
                      >
                        <Icon size={18} className="shrink-0" />
                        {!isMinimized && <span className="whitespace-nowrap">{item.name}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
              )}
            </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
