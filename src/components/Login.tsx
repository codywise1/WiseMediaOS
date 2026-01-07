import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authService, isSupabaseAvailable } from '../lib/supabase';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('Login attempt:', { email, isSupabaseAvailable: isSupabaseAvailable() });
    try {
      const success = await onLogin(email, password);
      if (!success) {
        setError('Invalid credentials. Please check your email and password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required for sign up.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.signUp(email, password, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        role: 'user'
      });

      alert('Account created successfully! Please check your email to verify your account.');
      setIsLogin(true);
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(error.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Fixed background for both mobile and desktop */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-20 transform-gpu"
        style={{
          backgroundImage:
            "url('https://codywise.io/wp-content/uploads/2025/02/IMG-4-Wise-Media.webp')"
        }}
      />

      {/* Background overlay for readability */}
      <div className="fixed inset-0 bg-black/20 -z-10 pointer-events-none" />

      <div className="glass-card rounded-2xl p-8 w-full max-w-sm relative z-10 border border-white/5 bg-black/60 backdrop-blur-2xl">
        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="https://codywise.io/wp-content/uploads/2025/02/Wise-Media-Logo.svg"
            alt="Wise Media"
            className="h-12 w-auto mx-auto mb-4"
          />
        </div>


        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={isLogin ? handleSubmit : handleSignUp} className="space-y-6">
          {!isLogin && (
            <div className="animate-in slide-in-from-top fade-in duration-300">
              <label htmlFor="name" className="block text-xs font-semibold text-gray-300 mb-2 ml-1">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#3aa3eb]/50 focus:border-[#3aa3eb]/50 transition-all"
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-300 mb-2 ml-1">
              Email *
            </label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#3aa3eb]/50 focus:border-[#3aa3eb]/50 transition-all"
              placeholder="Enter your email"
              required
            />
          </div>

          {!isLogin && (
            <div className="animate-in slide-in-from-top fade-in duration-300">
              <label htmlFor="phone" className="block text-xs font-semibold text-gray-300 mb-2 ml-1">
                Phone (Optional)
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#3aa3eb]/50 focus:border-[#3aa3eb]/50 transition-all"
                placeholder="Enter your phone number"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-300 mb-2 ml-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#3aa3eb]/50 focus:border-[#3aa3eb]/50 transition-all pr-12"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center group cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#3aa3eb] focus:ring-[#3aa3eb] focus:ring-offset-0 transition-colors"
              />
              <span className="ml-2 text-[10px] font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
            </label>
            <button type="button" className="text-[10px] font-medium text-[#3aa3eb] hover:text-blue-300 transition-colors">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#3aa3eb] hover:bg-[#4ab3fb] text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setEmail('');
              setPassword('');
              setName('');
              setPhone('');
            }}
            className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors uppercase letter-spacing-[0.1em]"
          >
            {isLogin ? 'Register account' : 'Back to login'}
          </button>
        </div>
      </div>
    </div>
  );
}
