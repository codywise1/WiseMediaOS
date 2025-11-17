import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import NotificationPanel from './NotificationPanel';

export default function TopNav() {
  const { profile } = useAuth();
  const { setCurrentPage } = useNavigation();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <nav className="h-20 border-b border-white/10 backdrop-blur-xl bg-black/20 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <h2 className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {profile?.role === 'admin' ? 'WiseMediaOS' : 'Creator Club'}
          </h2>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Bell size={20} className="text-white" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          </button>

        <button
          onClick={() => setCurrentPage('profile')}
          className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-white/10 hover:bg-white/5 rounded-lg transition-colors p-2"
        >
          <div className="text-right hidden sm:block">
            <p className="font-medium text-white" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
              {profile?.full_name || 'User'}
            </p>
            <p className="text-gray-400 capitalize" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
              {profile?.role}
            </p>
          </div>

          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/50"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : profile?.email?.[0].toUpperCase() || 'U'}
            </div>
          )}
        </button>
      </div>
    </nav>

    <NotificationPanel
      isOpen={showNotifications}
      onClose={() => setShowNotifications(false)}
    />
    </>
  );
}
