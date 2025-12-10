import { useMemo, useState } from 'react';
import { Bell, Plus, Search, ChevronDown, User, Settings, LogOut, LayoutGrid, UserPlus, FilePlus2, FileText, StickyNote, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationPanel from './NotificationPanel';

interface TopNavProps {
  currentUser?: {
    name?: string;
    email?: string;
    role?: string;
    avatar?: string;
  } | null;
  onLogout?: () => void;
}

export default function TopNav({ currentUser, onLogout }: TopNavProps) {
  const { profile, signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();

  const role = (profile?.role || currentUser?.role || '').toLowerCase();
  const displayName = profile?.full_name || currentUser?.name || profile?.email || currentUser?.email || 'User';
  const displayAvatar = profile?.avatar_url || currentUser?.avatar;

  const searchData = useMemo(
    () => ({
      clients: [
        { title: 'Acme Corp', meta: 'Active • SaaS', to: '/clients' },
        { title: 'Nova Labs', meta: 'VIP • Web3', to: '/clients' },
      ],
      projects: [
        { title: 'Brand Refresh', meta: 'In Progress • Acme', to: '/projects' },
        { title: 'Ecommerce Build', meta: 'Planning • Nova', to: '/projects' },
      ],
      invoices: [
        { title: 'INV-2041', meta: 'Pending • $4,800', to: '/invoices' },
        { title: 'INV-2038', meta: 'Paid • $12,400', to: '/invoices' },
      ],
      proposals: [
        { title: 'Performance Ads Package', meta: 'Draft • $9,500', to: '/proposals' },
      ],
      notes: [
        { title: 'Q1 Growth Plan', meta: 'Tag: Strategy', to: '/notes' },
      ],
      courses: [
        { title: 'Creator Funnels 101', meta: 'Course • 12 lessons', to: '/community/courses' },
      ],
    }),
    []
  );

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return searchData;
    const term = searchQuery.toLowerCase();
    const filterGroup = (items: { title: string; meta: string; to: string }[]) =>
      items.filter((item) => item.title.toLowerCase().includes(term) || item.meta.toLowerCase().includes(term));
    return {
      clients: filterGroup(searchData.clients),
      projects: filterGroup(searchData.projects),
      invoices: filterGroup(searchData.invoices),
      proposals: filterGroup(searchData.proposals),
      notes: filterGroup(searchData.notes),
      courses: filterGroup(searchData.courses),
    };
  }, [searchData, searchQuery]);

  const quickActions = useMemo(() => {
    const actions = [
      { label: 'New client', to: '/clients', roles: ['admin', 'staff'], icon: UserPlus },
      { label: 'New project', to: '/projects', roles: ['admin', 'staff'], icon: FilePlus2 },
      { label: 'New invoice', to: '/invoices', roles: ['admin'], icon: FileText },
      { label: 'New proposal', to: '/proposals', roles: ['admin'], icon: FileText },
      { label: 'New note', to: '/notes', roles: ['admin', 'staff'], icon: StickyNote },
      { label: 'New course', to: '/community/courses', roles: ['admin', 'staff'], icon: GraduationCap },
      { label: 'View invoices', to: '/invoices', roles: ['client'], icon: FileText },
      { label: 'Upload project file', to: '/projects', roles: ['client'], icon: FilePlus2 },
      { label: 'Start community post', to: '/community', roles: ['member'], icon: StickyNote },
      { label: 'Browse courses', to: '/community/courses', roles: ['member'], icon: GraduationCap },
    ];
    return actions.filter((action) => action.roles.includes(role));
  }, [role]);

  const groupedOrder: Array<keyof typeof filteredResults> = [
    'clients',
    'projects',
    'invoices',
    'proposals',
    'notes',
    'courses',
  ];

  const handleNavigate = (to: string) => {
    setShowQuickActions(false);
    setShowAvatarMenu(false);
    setIsSearchFocused(false);
    setSearchQuery('');
    navigate(to);
  };

  const handleSignOut = async () => {
    setShowAvatarMenu(false);
    setShowQuickActions(false);
    setShowNotifications(false);
    if (onLogout) {
      onLogout();
      return;
    }
    if (signOut) {
      await signOut();
    }
  };

  return (
    <>
      {(showQuickActions || showAvatarMenu || isSearchFocused) && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => {
            setShowQuickActions(false);
            setShowAvatarMenu(false);
            setIsSearchFocused(false);
          }}
        />
      )}
      <nav className="h-20 border-b border-white/10 backdrop-blur-xl bg-black/20 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 lg:gap-4" />

        <div className="hidden md:flex items-center w-full max-w-2xl mx-6 relative">
          <div className="flex items-center w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus-within:border-blue-500/70 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all backdrop-blur">
            <Search size={18} className="text-gray-400 mr-2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setShowQuickActions(false);
                setShowNotifications(false);
                setShowAvatarMenu(false);
                setIsSearchFocused(true);
              }}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
              placeholder="Search clients, projects, invoices, notes..."
              className="bg-transparent flex-1 text-sm text-white placeholder:text-gray-400 focus:outline-none"
            />
            <span className="text-xs text-gray-500 px-2 py-1 rounded-md border border-white/10">⌘ K</span>
          </div>

          {isSearchFocused && (
            <div className="absolute top-12 left-0 w-full bg-slate-950 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/40 max-h-96 overflow-y-auto animate-in slide-in-from-top">
              {groupedOrder.map((groupKey) => {
                const items = filteredResults[groupKey];
                if (!items || items.length === 0) return null;
                return (
                  <div key={groupKey} className="px-4 py-3 border-b border-white/5 last:border-none">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                      {groupKey}
                    </p>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <button
                          key={item.title}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleNavigate(item.to)}
                          className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <div>
                            <p className="text-sm text-white font-medium">{item.title}</p>
                            <p className="text-xs text-gray-400">{item.meta}</p>
                          </div>
                          <span className="text-xs text-blue-400">Open</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.values(filteredResults).every((arr) => !arr || arr.length === 0) && (
                <div className="p-4 text-center text-sm text-gray-400">No results</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          {quickActions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(false);
                  setShowAvatarMenu(false);
                  setIsSearchFocused(false);
                  setShowQuickActions((v) => !v);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white hover:bg-white/10 transition-colors"
              >
                <Plus size={18} />
                <span className="text-sm font-semibold hidden sm:inline">Quick actions</span>
                <ChevronDown size={16} className={`${showQuickActions ? 'rotate-180' : ''} transition-transform`} />
              </button>
              {showQuickActions && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-950 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in slide-in-from-top">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleNavigate(action.to)}
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <action.icon size={16} className="text-blue-300" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => {
              setShowQuickActions(false);
              setShowAvatarMenu(false);
              setIsSearchFocused(false);
              setShowNotifications(!showNotifications);
            }}
            className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Bell size={20} className="text-white" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setShowQuickActions(false);
                setShowNotifications(false);
                setIsSearchFocused(false);
                setShowAvatarMenu((v) => !v);
              }}
              className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-white/10 hover:bg-white/10 rounded-lg transition-colors p-2"
            >
              <div className="text-right hidden sm:block">
                <p className="font-medium text-white" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                  {displayName}
                </p>
                <p className="text-gray-400 capitalize" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
                  {role || 'guest'}
                </p>
              </div>

              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/50"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {displayName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
              <ChevronDown size={16} className={`${showAvatarMenu ? 'rotate-180' : ''} transition-transform`} />
            </button>

            {showAvatarMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-950 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in slide-in-from-top">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleNavigate('/community/profile')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <User size={16} /> Profile
                </button>
                {(role === 'admin' || role === 'staff') && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleNavigate('/community/profile')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                  >
                    <Settings size={16} /> Settings
                  </button>
                )}
                <button
                  disabled
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
                >
                  <LayoutGrid size={16} /> Switch workspace (soon)
                </button>
                <div className="border-t border-white/10" />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-200 hover:bg-white/5 transition-colors"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNavigate={(path) => handleNavigate(path)}
      />
    </>
  );
}

