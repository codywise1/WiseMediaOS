import React from 'react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  FolderIcon, 
  DocumentIcon, 
  CalendarIcon, 
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import ProfileModal from './ProfileModal';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
  avatar?: string;
  phone?: string;
  company?: string;
}

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  onLogout: () => void;
  onUpdateProfile?: (userData: Partial<User>) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Clients', href: '/clients', icon: UserCircleIcon, adminOnly: true },
  { name: 'Projects', href: '/projects', icon: FolderIcon, adminOnly: false },
  { name: 'Invoices', href: '/invoices', icon: DocumentIcon, adminOnly: false },
  { name: 'Appointments', href: '/appointments', icon: CalendarIcon },
  { name: 'Proposals', href: '/proposals', icon: ClipboardDocumentListIcon, adminOnly: true },
];

export default function Layout({ children, currentUser, onLogout, onUpdateProfile }: LayoutProps) {
  const location = useLocation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || currentUser?.role === 'admin'
  );

  const handleProfileUpdate = (userData: Partial<User>) => {
    if (onUpdateProfile) {
      onUpdateProfile(userData);
    }
    setIsProfileModalOpen(false);
  };
  return (
    <div className="min-h-screen relative z-10">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64">
        <div className="glass-card h-full p-6">
          {/* Logo */}
          <div className="flex items-center mb-8">
            <img 
              src="https://codywise.io/wp-content/uploads/2025/02/Wise-Media-Logo.svg" 
              alt="Wise Media"
              className="h-10 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-[#3aa3eb]/20 text-[#3aa3eb] border-l-4 border-[#3aa3eb] rounded-l-none'
                      : 'text-gray-300 hover:text-white hover:bg-slate-800/50 rounded-full'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="space-y-3">
              {/* User Profile Card */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full profile-card border border-white/20 transition-all duration-300 rounded-2xl hover:border-[#3aa3eb]/40 hover:shadow-lg hover:shadow-[#3aa3eb]/20 group"
              >
                <div className="p-4">
                  {/* Profile Label */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profile</span>
                    <PencilIcon className="h-4 w-4 text-white/40 group-hover:text-[#3aa3eb] transition-colors" />
                  </div>

                  {/* User Info */}
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={currentUser?.avatar || 'https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Favicon-Wise-Media.webp'}
                        alt={currentUser?.name || 'User'}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-md bg-white p-1"
                      />
                      {/* Online Status Indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-slate-900 shadow-sm"></div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-base font-bold text-white truncate">
                        {currentUser?.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {currentUser?.role === 'admin' ? 'Administrator' : 'Client'}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Logout Button */}
              <button 
                onClick={onLogout}
                className="w-full logout-card border border-white/20 transition-all duration-300 rounded-2xl hover:border-white/40 hover:bg-white/10 group"
              >
                <div className="flex items-center justify-center space-x-3 p-4">
                  <ArrowRightOnRectangleIcon className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
                  <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">Sign Out</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <div className="min-h-screen p-8">
          {children}
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleProfileUpdate}
        user={currentUser}
      />
    </div>
  );
}