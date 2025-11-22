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

    console.log('Login attempt:', { email, password, isSupabaseAvailable: isSupabaseAvailable() });
    try {
      const success = await onLogin(email, password);
      if (!success) {
        setError('Invalid credentials. Please check your username and password.');
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card neon-glow rounded-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://codywise.io/wp-content/uploads/2025/02/Wise-Media-Logo.svg" 
            alt="Wise Media"
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-400">
            {isLogin ? 'Sign in to your Wise Media portal' : 'Join the Wise Media platform'}
          </p>
        </div>

        {/* Test Credentials Info */}
        {!isSupabaseAvailable() && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
            <h3 className="text-blue-400 font-medium mb-2">Demo Mode - Test Credentials</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Admin Access:</span>
                <div className="text-right">
                  <div className="text-white">Username: <code className="bg-slate-800 px-2 py-1 rounded">admin</code></div>
                  <div className="text-white">Password: <code className="bg-slate-800 px-2 py-1 rounded">admin</code></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Client Access:</span>
                <div className="text-right">
                  <div className="text-white">Username: <code className="bg-slate-800 px-2 py-1 rounded">user</code></div>
                  <div className="text-white">Password: <code className="bg-slate-800 px-2 py-1 rounded">user</code></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={isLogin ? handleSubmit : handleSignUp} className="space-y-6">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Username *
            </label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
              placeholder="Enter: admin or user"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                Phone (Optional)
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                placeholder="Enter your phone number"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input w-full px-4 py-3 rounded-lg focus:outline-none transition-colors pr-12"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {isLogin && (
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-300">Remember me</span>
              </label>
              <button type="button" className="text-sm text-blue-400 hover:text-blue-300">
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full btn-primary"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-900 text-gray-400">or</span>
          </div>
        </div>

        {/* Toggle Form */}
        <div className="mt-6 text-center">
          <p className="text-gray-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </p>
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
            className="mt-2 text-blue-400 hover:text-blue-300 font-medium"
          >
            {isLogin ? 'Create an account' : 'Sign in instead'}
          </button>
        </div>
      </div>
    </div>
  );
}