import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, CheckCircle, ArrowLeft } from 'lucide-react';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        await resetPassword(email);
        setSuccess('Password reset email sent! Check your inbox.');
        setLoading(false);
      } else if (isSignUp) {
        await signUp(email, password, fullName);
        setSuccess('Account created successfully! Redirecting...');
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMessage = 'An error occurred. Please try again.';

      if (err.message) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address before signing in.';
        } else if (err.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="https://wisemedia.io/wp-content/uploads/2025/10/IMG-5-Wise-Media.webp"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Logo.svg"
            alt="Wise Media"
            className="h-12 mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isForgotPassword ? 'Reset Password' : isSignUp ? 'Join Creator Club' : 'Welcome Back'}
          </h1>
          <p className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            {isForgotPassword ? 'Enter your email to receive reset instructions' : isSignUp ? 'Start your creative journey' : 'Sign in to continue'}
          </p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-8 shadow-2xl">
          {isForgotPassword && (
            <button
              onClick={() => {
                setIsForgotPassword(false);
                setError('');
                setSuccess('');
              }}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6 text-sm"
              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && !isForgotPassword && (
              <div>
                <label className="block text-white text-sm font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div>
              <label className="block text-white text-sm font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            {!isForgotPassword && (
              <div>
                <label className="block text-white text-sm font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm flex items-center gap-2">
                <CheckCircle size={16} />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
            >
              <LogIn size={20} />
              {loading ? 'Please wait...' : isForgotPassword ? 'Send Reset Email' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {!isForgotPassword && (
              <>
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-blue-400 hover:text-blue-300 transition-colors text-sm block w-full"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
                {!isSignUp && (
                  <button
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError('');
                      setSuccess('');
                    }}
                    className="text-gray-400 hover:text-gray-300 transition-colors text-sm"
                    style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                  >
                    Forgot password?
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
