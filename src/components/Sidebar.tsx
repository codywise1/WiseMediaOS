import { useState } from 'react';
import {
  Home,
  FolderKanban,
  Calendar,
  FileText,
  Receipt,
  Users,
  BarChart3,
  StickyNote,
  MessageSquare,
  Settings,
  BookOpen,
  ShoppingBag,
  Wrench,
  User,
  TrendingUp,
  Menu,
  X,
  LogOut,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { supabase } from '../lib/supabase';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  roles: string[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'elite', 'pro', 'free'] },
  { id: 'projects', label: 'Projects', icon: FolderKanban, roles: ['admin'] },
  { id: 'appointments', label: 'Appointments', icon: Calendar, roles: ['admin'] },
  { id: 'invoices', label: 'Invoices', icon: Receipt, roles: ['admin'] },
  { id: 'proposals', label: 'Proposals', icon: FileText, roles: ['admin'] },
  { id: 'clients', label: 'Clients', icon: Users, roles: ['admin'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
  { id: 'notes', label: 'Notes', icon: StickyNote, roles: ['admin'] },
  { id: 'courses', label: 'Courses', icon: BookOpen, roles: ['elite', 'pro', 'free'] },
  { id: 'community', label: 'Community', icon: MessageSquare, roles: ['admin', 'elite', 'pro', 'free'] },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, roles: ['elite', 'pro', 'free'] },
  { id: 'tools', label: 'Tools', icon: Wrench, roles: ['elite', 'pro', 'free'] },
  { id: 'admin-backend', label: 'Creator Club Backend', icon: Shield, roles: ['admin'] },
  { id: 'profile', label: 'Profile', icon: User, roles: ['admin', 'elite', 'pro', 'free'] },
  { id: 'referrals', label: 'Referrals', icon: TrendingUp, roles: ['elite', 'admin'] },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'elite', 'pro', 'free'] },
];

export default function Sidebar() {
  const { profile } = useAuth();
  const { currentPage, setCurrentPage } = useNavigation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const filteredItems = navItems.filter(item =>
    item.roles.includes(profile?.role || 'free')
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg text-white"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`
        ${isCollapsed ? 'w-20' : 'w-64'}
        h-screen fixed left-0 top-0 z-40 backdrop-blur-xl bg-black/40 border-r border-white/10
        transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className={`p-6 border-b border-white/10 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <img
                src="https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Logo.svg"
                alt="Wise Media"
                className="h-10"
              />
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-300 hover:text-white"
            >
              <Menu size={20} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => {
                      setCurrentPage(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/50 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                    style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px' }}
                  >
                    <Icon size={20} />
                    {!isCollapsed && <span className="font-medium">{item.label}</span>}
                  </button>

                  {isCollapsed && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="relative group">
              <button
                onClick={handleSignOut}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-all duration-200 text-gray-300 hover:bg-red-500/10 hover:text-red-400 hover:border hover:border-red-500/50`}
                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px' }}
              >
                <LogOut size={20} />
                {!isCollapsed && <span className="font-medium">Sign Out</span>}
              </button>

              {isCollapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                  Sign Out
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
