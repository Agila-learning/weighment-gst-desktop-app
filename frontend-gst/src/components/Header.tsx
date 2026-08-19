import { useState, useEffect, useRef } from 'react';
import { Bell, UserCircle, X } from 'lucide-react';
import apiClient from '../api/client';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../services/AuthService';

const Header = () => {
  const { user, logout } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/audit');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm z-10 relative">
      <div className="text-xl font-semibold text-gray-800">
        Welcome back, Admin
      </div>
      <div className="flex items-center gap-4 text-gray-600">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-800">Recent Activity</h3>
                <button onClick={() => setShowDropdown(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center py-6 text-gray-500 text-sm">No recent activity.</p>
                ) : (
                  notifications.map((log) => (
                    <div key={log.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium text-blue-600">{log.action}</span> 
                        {' '}on <span className="font-medium">{log.entity}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : 'Just now'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors group relative">
          <UserCircle size={24} />
          <span className="font-medium">{user?.name || 'Admin User'}</span>
          
          {/* Dropdown for user menu */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 hidden group-hover:block z-50">
            <div className="p-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <button 
              onClick={logout}
              className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
