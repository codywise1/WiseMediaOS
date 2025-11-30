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
            <div className="space-y-4">
              {/* User Profile Card */}
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full profile-card border border-white/20 transition-all duration-300 rounded-2xl hover:border-white/40"
              >
                <div className="flex items-center space-x-4 p-5">
                  <div className="relative">
                    {currentUser?.avatar ? (
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.name}
                        className="w-14 h-14 rounded-full object-cover border-3 border-white/30 shadow-lg"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#3aa3eb] to-blue-600 flex items-center justify-center border-3 border-white/30 shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    {/* Online Status Indicator */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 shadow-sm"></div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-lg font-bold text-white truncate leading-tight">
                      {currentUser?.name}
                    </p>
                    {currentUser?.company && (
                      <p className="text-sm text-gray-300 truncate mt-0.5">
                        {currentUser.company}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {currentUser?.role === 'admin' ? 'Administrator' : 'Client'}
                    </p>
                  </div>
                  <div className="text-white/60">
                    <PencilIcon className="h-5 w-5" />
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