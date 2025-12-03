import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  DocumentIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentTextIcon,
  LifebuoyIcon,
  EllipsisHorizontalIcon
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

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, adminOnly: false },
  { name: 'Clients', href: '/clients', icon: UserCircleIcon, adminOnly: true },
  { name: 'Projects', href: '/projects', icon: FolderIcon, adminOnly: false },
  { name: 'Notes', href: '/notes', icon: DocumentTextIcon, adminOnly: false },
];

const secondaryNavigation = [
  { name: 'Invoices', href: '/invoices', icon: DocumentIcon, adminOnly: false },
  { name: 'Appointments', href: '/appointments', icon: CalendarIcon, adminOnly: false },
  { name: 'Proposals', href: '/proposals', icon: ClipboardDocumentListIcon, adminOnly: true },
  { name: 'Support', href: '/support', icon: LifebuoyIcon, adminOnly: false },
];

export default function Layout({ children, currentUser, onLogout, onUpdateProfile }: LayoutProps) {
  const location = useLocation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const filteredMainNav = mainNavigation.filter(item =>
    !item.adminOnly || isAdmin
  );

  const filteredSecondaryNav = secondaryNavigation.filter(item =>
    !item.adminOnly || isAdmin
  );

  const handleProfileUpdate = (userData: Partial<User>) => {
    if (onUpdateProfile) {
      onUpdateProfile(userData);
    }
    setIsProfileModalOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen relative z-10">
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-50 w-64">
        <div className="glass-card h-full p-6 flex flex-col">
          <div className="flex items-center mb-8">
            <img
              src="https://codywise.io/wp-content/uploads/2025/02/Wise-Media-Logo.svg"
              alt="Wise Media"
              className="h-10 w-auto"
            />
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto">
            <div className="space-y-1 mb-6">
              {filteredMainNav.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-[#3aa3eb]/20 text-[#3aa3eb] border-l-4 border-[#3aa3eb] rounded-l-none'
                        : 'text-gray-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-1">
              {filteredSecondaryNav.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-[#3aa3eb]/20 text-[#3aa3eb] border-l-4 border-[#3aa3eb] rounded-l-none'
                        : 'text-gray-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <div className="mt-auto pt-6 space-y-3">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="w-full profile-card border border-white/20 transition-all duration-300 rounded-2xl hover:border-[#3aa3eb]/40 hover:shadow-lg hover:shadow-[#3aa3eb]/20 group"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profile</span>
                  <PencilIcon className="h-4 w-4 text-white/40 group-hover:text-[#3aa3eb] transition-colors" />
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={currentUser?.avatar || 'https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Favicon-Wise-Media.webp'}
                      alt={currentUser?.name || 'User'}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-md bg-white p-1"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-slate-900 shadow-sm"></div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-base font-bold text-white truncate">
                      {currentUser?.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {isAdmin ? 'Administrator' : 'Client'}
                    </p>
                  </div>
                </div>
              </div>
            </button>

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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={closeMobileMenu}
        >
          <div
            className="fixed inset-y-0 right-0 w-80 max-w-[85vw] glass-card p-6 transform transition-transform duration-300 ease-out overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <img
                src="https://codywise.io/wp-content/uploads/2025/02/Wise-Media-Logo.svg"
                alt="Wise Media"
                className="h-8 w-auto"
              />
              <button
                onClick={closeMobileMenu}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">Main</p>
                {filteredMainNav.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-[#3aa3eb]/20 text-[#3aa3eb]'
                          : 'text-gray-300 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>

              <div className="border-t border-white/10 pt-4 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">More</p>
                {filteredSecondaryNav.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-[#3aa3eb]/20 text-[#3aa3eb]'
                          : 'text-gray-300 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <button
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    closeMobileMenu();
                  }}
                  className="w-full profile-card border border-white/20 transition-all duration-300 rounded-2xl hover:border-[#3aa3eb]/40 group"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profile</span>
                      <PencilIcon className="h-4 w-4 text-white/40 group-hover:text-[#3aa3eb] transition-colors" />
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={currentUser?.avatar || 'https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Favicon-Wise-Media.webp'}
                          alt={currentUser?.name || 'User'}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-md bg-white p-1"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-slate-900 shadow-sm"></div>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-base font-bold text-white truncate">
                          {currentUser?.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {isAdmin ? 'Administrator' : 'Client'}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onLogout();
                    closeMobileMenu();
                  }}
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
      )}

      {/* Mobile Bottom Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe">
        <div className="glass-card border-t border-white/10 px-2 py-3 backdrop-blur-xl bg-slate-900/95">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {filteredMainNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center justify-center space-y-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[70px] ${
                    isActive
                      ? 'bg-[#3aa3eb]/20 text-[#3aa3eb] scale-105'
                      : 'text-gray-400 hover:text-white active:scale-95'
                  }`}
                >
                  <item.icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span className="text-xs font-medium">{item.name}</span>
                </NavLink>
              );
            })}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center space-y-1 px-4 py-2 rounded-xl transition-all duration-200 text-gray-400 hover:text-white active:scale-95 min-w-[70px]"
            >
              <EllipsisHorizontalIcon className="h-6 w-6" />
              <span className="text-xs font-medium">More</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64">
        <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleProfileUpdate}
        user={currentUser}
      />
    </div>
  );
}
