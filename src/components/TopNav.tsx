import { useEffect, useMemo, useState } from 'react';
import { Bell, Search, ChevronDown, User, Settings, LogOut, LayoutGrid, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationPanel from './NotificationPanel';
import { clientService, projectService, invoiceService, proposalService, noteService } from '../lib/supabase';

interface TopNavProps {
  currentUser?: {
    name?: string;
    email?: string;
    role?: string;
    avatar?: string;
  } | null;
  onLogout?: () => void;
  onOpenMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
}

type SearchItem = {
  title: string;
  meta: string;
  to: string;
};

type SearchGroups = {
  clients: SearchItem[];
  projects: SearchItem[];
  invoices: SearchItem[];
  proposals: SearchItem[];
  notes: SearchItem[];
  courses: SearchItem[];
};

export default function TopNav({ currentUser, onLogout, onOpenMobileMenu, isSidebarCollapsed }: TopNavProps) {
  const { profile, signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();

  const normalizeSearchText = (value: unknown) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const role = (profile?.role || currentUser?.role || '').toLowerCase();
  const displayName = profile?.full_name || currentUser?.name || profile?.email || currentUser?.email || 'User';
  const displayAvatar = profile?.avatar_url || currentUser?.avatar;
  const [searchData, setSearchData] = useState<SearchGroups>({
    clients: [],
    projects: [],
    invoices: [],
    proposals: [],
    notes: [],
    courses: [],
  });

  useEffect(() => {
    let cancelled = false;

    const loadSearchData = async () => {
      try {
        const [clients, projects, invoices, proposals, notes] = await Promise.all([
          clientService.getAll().catch(() => []),
          projectService.getAll().catch(() => []),
          invoiceService.getAll().catch(() => []),
          proposalService.getAll().catch(() => []),
          noteService.getAll().catch(() => []),
        ]);

        if (cancelled) return;

        const groups: SearchGroups = {
          clients: (clients as any[]).map((c) => ({
            title: c.company || c.name || c.email,
            meta: [c.name, c.status, c.email].filter(Boolean).join(' \u2022 '),
            to: `/clients/${c.id}`,
          })),
          projects: (projects as any[]).map((p) => ({
            title: p.name,
            meta: [p.client?.name || p.client, p.status].filter(Boolean).join(' \u2022 '),
            to: `/projects/${p.id}`,
          })),
          invoices: (invoices as any[]).map((inv) => ({
            title: inv.description || `Invoice ${inv.id}`,
            meta: [
              inv.client?.name,
              inv.status && inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
              typeof inv.amount === 'number' ? `$${inv.amount.toLocaleString()}` : undefined,
            ]
              .filter(Boolean)
              .join(' \u2022 '),
            to: `/invoices/${inv.id}`,
          })),
          proposals: (proposals as any[]).map((p) => ({
            title: p.title,
            meta: [p.client?.name, p.status].filter(Boolean).join(' \u2022 '),
            to: '/proposals',
          })),
          notes: (notes as any[]).map((n) => ({
            title: n.title,
            meta: [n.category, n.client?.name, n.project?.name].filter(Boolean).join(' \u2022 '),
            to: '/notes',
          })),
          courses: [
            {
              title: 'Courses',
              meta: 'Browse all courses',
              to: '/community/courses',
            },
          ],
        };

        setSearchData(groups);
      } catch (error) {
        console.error('Error loading search data:', error);
      }
    };

    loadSearchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return searchData;
    const term = normalizeSearchText(searchQuery);
    const filterGroup = (items: { title: string; meta: string; to: string }[]) =>
      items.filter((item) =>
        normalizeSearchText(item.title).includes(term) || normalizeSearchText(item.meta).includes(term)
      );
    return {
      clients: filterGroup(searchData.clients),
      projects: filterGroup(searchData.projects),
      invoices: filterGroup(searchData.invoices),
      proposals: filterGroup(searchData.proposals),
      notes: filterGroup(searchData.notes),
      courses: filterGroup(searchData.courses),
    };
  }, [searchData, searchQuery]);

  const groupedOrder: Array<keyof typeof filteredResults> = [
    'clients',
    'projects',
    'invoices',
    'proposals',
    'notes',
    'courses',
  ];

  const handleNavigate = (to: string) => {
    // setShowQuickActions(false);
    setShowAvatarMenu(false);
    setIsSearchFocused(false);
    setShowMobileSearch(false);
    setSearchQuery('');
    navigate(to);
  };

  const handleSignOut = async () => {
    setShowAvatarMenu(false);
    // setShowQuickActions(false);
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
      {(showAvatarMenu || isSearchFocused || showMobileSearch) && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => {
            setShowAvatarMenu(false);
            setIsSearchFocused(false);
            setShowMobileSearch(false);
          }}
        />
      )}
      <nav className="h-20 border-b border-white/10 backdrop-blur-xl bg-black/20 px-4 lg:px-8 flex items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(false);
              setShowAvatarMenu(false);
              setIsSearchFocused(false);
              onOpenMobileMenu?.();
            }}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} className="text-white" />
          </button>

          <img
            src="https://codywise.io/wp-content/uploads/2025/02/Wise-Media-Logo.svg"
            alt="Wise Media"
            className={`h-8 w-auto ${isSidebarCollapsed ? '' : 'md:hidden'}`}
          />
        </div>

        <div className="hidden md:flex items-center flex-1 max-w-xl ml-4 relative">
          <div className="flex items-center w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus-within:border-[#59a1e5]/70 focus-within:ring-2 focus-within:ring-[#59a1e5]/30 transition-all backdrop-blur">
            <Search size={18} className="text-gray-400 mr-2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setShowNotifications(false);
                setShowAvatarMenu(false);
                setIsSearchFocused(true);
              }}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
              placeholder="Search workplace"
              className="bg-transparent flex-1 text-sm text-white placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          {isSearchFocused && (
            <div className="absolute top-12 left-0 w-full bg-slate-950 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/40 max-h-96 overflow-y-auto">
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
                          className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
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

        {/* Mobile Search Overlay */}
        {showMobileSearch && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-slate-950/95 backdrop-blur-xl border-b border-white/10 p-4 z-50 animate-in slide-in-from-top">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 flex items-center bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus-within:border-[#59a1e5]/70 focus-within:ring-2 focus-within:ring-[#59a1e5]/30 transition-all backdrop-blur">
                <Search size={18} className="text-gray-400 mr-2" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workplace"
                  className="bg-transparent flex-1 text-sm text-white placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowMobileSearch(false)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {searchQuery.trim() && (
                <>
                  {groupedOrder.map((groupKey) => {
                    const items = filteredResults[groupKey];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={groupKey} className="mb-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2 px-1">
                          {groupKey}
                        </p>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <button
                              key={item.title}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleNavigate(item.to)}
                              className="w-full text-left flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                            >
                              <div>
                                <p className="text-sm text-white font-medium">{item.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item.meta}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.values(filteredResults).every((arr) => !arr || arr.length === 0) && (
                    <div className="py-8 text-center text-sm text-gray-400">No results found</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 lg:gap-4 ml-auto">
          <button
            onClick={() => {
              setShowNotifications(false);
              setShowAvatarMenu(false);
              setShowMobileSearch((prev) => !prev);
            }}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Search size={20} className="text-white" />
          </button>

          <button
            onClick={() => {
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
              <div className="absolute right-0 mt-2 w-64 bg-slate-950 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
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

