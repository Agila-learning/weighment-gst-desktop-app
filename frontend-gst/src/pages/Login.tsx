import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/AuthService';
import apiClient from '../api/client';
import { CheckCircle, FileText, Calculator, Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await apiClient.post('/auth/login', {
        email,
        password,
        application: 'GST_BILLING'
      });
      
      setSuccess(true);
      setTimeout(() => {
        login(res.data.token, res.data.user);
        navigate('/');
      }, 800);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 overflow-hidden font-sans">
      {/* LEFT SIDE: Animated GST Billing Visual */}
      <div className="hidden lg:flex w-[55%] bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 items-center justify-center relative">
        <div className="absolute inset-0 overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiPjxwYXRoIGQ9Ik02MCAwaC02MHY2MGg2MHoiLz48L2c+PC9zdmc+')]"></div>
          {/* Soft floating particles (css animation) */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        {/* The Animation Container */}
        <div className="relative z-10 w-full max-w-md h-[500px] flex flex-col items-center justify-center perspective-1000">
          
          <div className="relative w-80 h-96 animate-float">
            
            {/* Invoice Card */}
            <div className="absolute inset-0 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col transform transition-transform duration-1000">
              
              {/* Card Header */}
              <div className="h-16 bg-blue-50 border-b border-blue-100 flex items-center px-6 justify-between">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">TAX INVOICE</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-lg font-bold">₹</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col gap-4">
                {/* Lines */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center opacity-0 animate-fade-in-1">
                    <div className="h-2 w-24 bg-gray-200 rounded"></div>
                    <div className="h-2 w-12 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex justify-between items-center opacity-0 animate-fade-in-2">
                    <div className="h-2 w-32 bg-gray-200 rounded"></div>
                    <div className="h-2 w-16 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex justify-between items-center opacity-0 animate-fade-in-3">
                    <div className="h-2 w-20 bg-gray-200 rounded"></div>
                    <div className="h-2 w-14 bg-gray-200 rounded"></div>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-200 my-2 opacity-0 animate-fade-in-3"></div>

                {/* Calculation */}
                <div className="space-y-2 opacity-0 animate-fade-in-4">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>₹15,000.00</span>
                  </div>
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>+ CGST (2.5%)</span>
                    <span>₹375.00</span>
                  </div>
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>+ SGST (2.5%)</span>
                    <span>₹375.00</span>
                  </div>
                </div>
                
                <div className="mt-auto opacity-0 animate-fade-in-5 bg-gray-50 -mx-6 -mb-6 p-6 border-t border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-gray-700">Total</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-bold text-blue-900">₹15,750.00</span>
                    <CheckCircle className="w-5 h-5 text-green-500 animate-bounce-subtle" />
                  </div>
                </div>

              </div>
              
            </div>
            
            {/* PDF conversion visual overlay */}
            <div className="absolute inset-0 bg-blue-600/90 rounded-xl shadow-2xl flex flex-col items-center justify-center opacity-0 animate-pdf-convert backdrop-blur-sm z-20">
              <FileText className="w-16 h-16 text-white mb-4 animate-pulse" />
              <span className="text-white font-bold tracking-widest">PDF GENERATED</span>
            </div>

          </div>
          
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center bg-white p-8 animate-slide-in-right">
        <div className="w-full max-w-md">
          
          <div className="mb-10 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
              <div className="h-16 w-16 bg-indigo-100 rounded-xl flex items-center justify-center p-2 mb-4">
                <img src="./icon.png" alt="FIC GST Billing" className="w-full h-full object-contain rounded-lg shadow-sm" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">FIC GST</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500">Sign in to continue to your billing workspace.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Username / Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none"
                placeholder="Enter your username or email"
                required
                autoFocus
              />
            </div>
            
            <div className="space-y-1 relative">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
                <span className="text-sm text-gray-600">Remember Username</span>
              </label>
              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="relative w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 overflow-hidden"
            >
              <div className="flex items-center justify-center space-x-2">
                {success ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Access Granted</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>LOGIN</span>
                )}
              </div>
            </button>
          </form>
          
          <div className="mt-12 text-center text-sm text-gray-400">
            <p>Version 1.0.0</p>
            <div className="mt-2 text-xs text-gray-400 font-medium">
              Powered by <span className="font-semibold text-gray-600">FIC GST</span>
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  );
};

export default Login;
