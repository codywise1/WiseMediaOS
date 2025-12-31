import { useState } from 'react';
import { X, Lock } from 'lucide-react';
import GlassCard from './GlassCard';
import { supabase } from '../lib/supabase';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-in zoom-in">
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Lock className="text-purple-400" size={20} />
                </div>
                <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Change Password
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="text-green-400" size={32} />
                </div>
                <p className="text-white font-medium" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                  Password changed successfully!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg transition-colors font-medium"
                    style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                    style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </GlassCard>
        </div>
      </div>
    </>
  );
}
