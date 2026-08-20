import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/AuthService';
import { ShieldCheck, Loader2, Eye, EyeOff, Wifi, WifiOff, User, Lock } from 'lucide-react';
import AnimatedWeighbridge from '../components/AnimatedWeighbridge';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* LEFT SIDE: Animated Weighbridge Visual */}
      <AnimatedWeighbridge />

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center bg-white p-8 relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-md">
          
          <div className="mb-10 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-2">
              <div className="h-14 w-14 bg-emerald-100/50 rounded-xl flex items-center justify-center p-2 mb-4 ring-1 ring-emerald-200">
                <img src="./icon.png" alt="FIC Weighbridge" className="w-full h-full object-contain rounded-lg shadow-sm" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">FIC WEIGHBRIDGE</h1>
                <span className="text-sm font-semibold text-emerald-600 tracking-widest uppercase">Management System</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">Smart Weighing • Accurate Results • Reliable Operations</p>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome Back</h2>
            <p className="text-slate-500 text-sm">Sign in to continue to weighbridge operations.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start space-x-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Network Status Badge */}
            <div className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border ${isOnline ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-xs font-bold tracking-wide uppercase">{isOnline ? '● Online Mode' : '● Offline Mode'}</span>
            </div>
            
            <div className="space-y-1.5 relative">
              <label className="text-sm font-semibold text-slate-700">Username / Email</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder-slate-400 shadow-sm"
                  placeholder="Enter your username or email"
                  required
                  autoFocus
                />
              </div>
            </div>
            
            <div className="space-y-1.5 relative">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 bg-white rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder-slate-400 shadow-sm"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-blue-600 bg-white border-slate-300 focus:ring-blue-500 focus:ring-offset-white" />
                <span className="text-sm font-medium text-slate-600">Remember Username</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="mt-4 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all hover:shadow-md hover:-translate-y-px disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <div className="flex items-center justify-center space-x-2">
                {success ? (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Access Granted</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>LOGIN →</span>
                )}
              </div>
            </button>
          </form>
          
          <div className="mt-12 text-center text-xs font-semibold text-slate-400 tracking-wider">
            <p>VERSION 1.0.0</p>
            <div className="mt-2 text-[10px] text-slate-400 font-medium">
              Powered by <span className="font-bold text-slate-600">FIC GST</span>
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  );
};

export default Login;
