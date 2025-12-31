import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Bell, Lock, Globe, CreditCard } from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function SettingsPage() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  return (
    <>
      <div className="space-y-8">
        <h1 className="text-4xl font-bold text-white text-[40px]" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Settings
        </h1>

        <div className="space-y-8">
          <GlassCard>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Bell className="text-blue-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-4" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Notifications
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Email Notifications</span>
                    <input type="checkbox" className="w-5 h-5" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Push Notifications</span>
                    <input type="checkbox" className="w-5 h-5" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Weekly Newsletter</span>
                    <input type="checkbox" className="w-5 h-5" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
                  </label>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Lock className="text-purple-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-4" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Security
                </h3>
                <div className="space-y-3">
                  <button onClick={() => setShowPasswordModal(true)} className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    Change Password
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    Two-Factor Authentication
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    Connected Devices
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Globe className="text-green-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-4" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Preferences
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-gray-300 mb-2 block" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Language</label>
                    <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 mb-2 block" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Timezone</label>
                    <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      <option>UTC-5 (Eastern)</option>
                      <option>UTC-6 (Central)</option>
                      <option>UTC-7 (Mountain)</option>
                      <option>UTC-8 (Pacific)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <CreditCard className="text-yellow-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-4" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Billing
                </h3>
                <div className="space-y-3">
                  <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    Payment Methods
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    Billing History
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    Upgrade Plan
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  );
}
