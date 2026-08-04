import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useLoadingGuard } from '../hooks/useLoadingGuard';
import {
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  Squares2X2Icon,
  Bars3Icon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowUpOnSquareIcon
} from '@heroicons/react/24/outline';
import { ArrowRight } from 'lucide-react';
import ClientModal from './ClientModal';
import ConfirmDialog from './ConfirmDialog';
import ClientTableView from './ClientTableView';
import CategoryBadge from './CategoryBadge';
import { clientService, Client, UserRole } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import { formatPhoneNumber } from '../lib/phoneFormat';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function FilterSheet({
  open,
  onClose,
  onApply,
  searchQuery, setSearchQuery,
  stateFilter, setStateFilter,
  categoryFilter, setCategoryFilter,
  locationFilter, setLocationFilter,
  sortBy, setSortBy,
  uniqueCategories,
  uniqueLocations,
}: {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  searchQuery: string; setSearchQuery: (v: string) => void;
  stateFilter: string; setStateFilter: (v: string) => void;
  categoryFilter: string; setCategoryFilter: (v: string) => void;
  locationFilter: string; setLocationFilter: (v: string) => void;
  sortBy: 'newest' | 'oldest'; setSortBy: (v: 'newest' | 'oldest') => void;
  uniqueCategories: string[];
  uniqueLocations: string[];
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const activeCount = [searchQuery, stateFilter !== 'all', categoryFilter !== 'all', locationFilter !== 'all', sortBy !== 'newest'].filter(Boolean).length;

  if (!open) return null;

  const handleTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 80) { onClose(); startY.current = null; }
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={sheetRef}
        className="ios-sheet-panel ios-sheet-enter absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1.5 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/8">
          <h3 className="text-lg font-bold text-white">Filters</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
n                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/[0.08] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Client State</label>
            <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="w-full px-4 py-3 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50" style={{ fontSize: '16px' }}>
              <option value="all">All States</option>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="vip">VIP</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Industry</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full px-4 py-3 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50" style={{ fontSize: '16px' }}>
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Location</label>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full px-4 py-3 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50" style={{ fontSize: '16px' }}>
              <option value="all">All Locations</option>
              {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sort by Date</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')} className="w-full px-4 py-3 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50" style={{ fontSize: '16px' }}>
              <option value="newest">Newest to Oldest</option>
              <option value="oldest">Oldest to Newest</option>
            </select>
          </div>
        </div>
        <div className="sticky bottom-0 flex gap-3 px-5 py-4 border-t border-white/8" style={{ background: '#1c1f24', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => { setSearchQuery(''); setStateFilter('all'); setCategoryFilter('all'); setLocationFilter('all'); setSortBy('newest'); }}
            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-medium"
            style={{ fontSize: '16px' }}
          >
            Clear all
          </button>
          <button
            onClick={onApply}
            className="flex-1 py-3 bg-[#3aa3eb] rounded-xl text-white font-medium"
            style={{ fontSize: '16px' }}
          >
            Apply{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function OverflowMenu({ client, isAdmin, onView, onEdit, onDelete }: {
  client: Client;
  isAdmin: boolean;
  onView: (c: Client) => void;
  onEdit: (c: Client) => void;
  onDelete: (c: Client) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        title="More"
      >
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-white/10 py-1 shadow-2xl" style={{ background: '#1c1f24' }}>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onView(client); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5 flex items-center gap-2">
            <EyeIcon className="h-4 w-4" /> View Details
          </button>
          {isAdmin && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(client); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5 flex items-center gap-2">
                <PencilIcon className="h-4 w-4" /> Edit
              </button>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(client); }} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                <TrashIcon className="h-4 w-4" /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface ClientsProps {
  currentUser: User | null;
}

const statusConfig: Record<Client['status'], { color: string; label: string }> = {
  prospect: { color: 'rgba(250,204,21,0.33) text-white border-#facc15', label: 'Prospect' },
  active: { color: 'rgba(34,197,94,0.33) text-white border-#22c55e', label: 'Active' },
  vip: { color: 'rgba(64,172,64,0.33) text-white border-#40ac40', label: 'VIP' },
  inactive: { color: 'rgba(234,59,59,0.3) text-white border-#ea3b3b', label: 'Inactive' },
  archived: { color: 'rgba(217,119,6,0.1) text-white border-#d97706', label: 'Archived' },
};

export default function Clients({ currentUser }: ClientsProps) {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    return (localStorage.getItem('clients_view_mode') as 'cards' | 'table') || 'cards';
  });
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const effectiveViewMode = isDesktop ? viewMode : 'cards';
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  useLoadingGuard(loading, setLoading);

  useEffect(() => {
    loadClients();
  }, [currentUser?.id, currentUser?.role]);

  const loadClients = async () => {
    try {
      if (clients.length === 0) {
        setLoading(true);
      }
      const data = await clientService.getAll();
      setClients(data);
      console.log('Clients loaded:', data.length);
    } catch (error) {
      console.error('Error loading clients:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Only wipe data and show alert if we have no data yet
      if (clients.length === 0) {
        alert(`Error loading clients: ${errorMessage}\n\nUsing offline mode.`);
        setClients([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewClient = () => {
    setSelectedClient(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveClient = async (clientData: any) => {
    // Prevent duplicate submissions
    if (loading) return;

    try {
      setLoading(true);
      console.log('Saving client data:', clientData);

      // Validate required fields
      if (!clientData.name || !clientData.email) {
        toastError('Name and email are required fields.');
        setLoading(false);
        return;
      }

      if (modalMode === 'create') {
        const newClient = await clientService.create(clientData);
        console.log('Client created:', newClient);
        setClients(prevClients => [...prevClients, newClient]);
        setIsModalOpen(false);
        toastSuccess('Client created successfully.');
      } else if (selectedClient) {
        const updatedClient = await clientService.update(selectedClient.id, clientData);
        console.log('Client updated:', updatedClient);
        setClients(prevClients =>
          prevClients.map(c => c.id === selectedClient.id ? updatedClient : c)
        );
        setIsModalOpen(false);
        toastSuccess('Client updated successfully.');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        toastError('A client with this email already exists. Please use a different email address.');
      } else if (errorMessage.includes('Database error')) {
        toastError(`Database error: ${errorMessage}. Please check your Supabase connection.`);
      } else {
        toastError(`Failed to save client: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (selectedClient) {
      try {
        await clientService.delete(selectedClient.id);
        setClients(clients.filter(c => c.id !== selectedClient.id));
        setIsDeleteDialogOpen(false);
        setSelectedClient(undefined);
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Error deleting client. Please try again.');
      }
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  const handleViewModeChange = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('clients_view_mode', mode);
  };

  const handleViewClient = (client: Client) => {
    navigate(`/clients/${client.id}`);
  };

  const confusableCharMap: Record<string, string> = {
    а: 'a',
    в: 'b',
    д: 'd',
    е: 'e',
    г: 'r',
    н: 'h',
    о: 'o',
    п: 'n',
    р: 'p',
    с: 'c',
    ѕ: 's',
    һ: 'h',
    х: 'x',
    у: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    т: 't',
    і: 'i',
    ј: 'j',
    ν: 'v',
    ο: 'o',
    ρ: 'p',
    χ: 'x',
    υ: 'y',
    α: 'a'
  };

  const normalizeText = (value: unknown) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[авдегнопсѕһхуктліјνορχυα]/gu, (ch) => confusableCharMap[ch] ?? ch)
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{Letter}\p{Number}\s]+/gu, ' ')
      .replace(/\s+/g, ' ');
  };

  const filteredClients = clients.filter(client => {
    const q = normalizeText(searchQuery);
    const tokens = q.split(' ').filter(Boolean);
    const searchableText = [client.name, client.email, client.company]
      .map(normalizeText)
      .join(' ');

    const qCompact = q.replace(/\s+/g, '');
    const searchableCompact = searchableText.replace(/\s+/g, '');

    const matchesSearch =
      tokens.length === 0 ||
      searchableText.includes(q) ||
      tokens.every(token => searchableText.includes(token)) ||
      (qCompact.length > 0 && searchableCompact.includes(qCompact));

    const matchesState = stateFilter === 'all' || client.status === stateFilter;
    const matchesCategory = categoryFilter === 'all' || client.category === categoryFilter;
    const matchesLocation = locationFilter === 'all' || client.location === locationFilter;

    return matchesSearch && matchesState && matchesCategory && matchesLocation;
  }).sort((a, b) => {
    const aTime = new Date(a.created_at).getTime() || 0;
    const bTime = new Date(b.created_at).getTime() || 0;
    return sortBy === 'newest' ? bTime - aTime : aTime - bTime;
  });

  const uniqueCategories = Array.from(new Set(clients.map(c => c.category).filter(Boolean)));
  const uniqueLocations = Array.from(new Set(clients.map(c => c.location).filter(Boolean)));
  const activeFilterCount = [searchQuery, stateFilter !== 'all', categoryFilter !== 'all', locationFilter !== 'all', sortBy !== 'newest'].filter(Boolean).length;


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const activeClients = clients.filter(c => c.status === 'active').length;
  const prospects = clients.filter(c => c.status === 'prospect').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="min-w-0">
            <h1 className="font-display font-bold gradient-text leading-tight tracking-tight uppercase mb-2" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)' }}>
              Clients
            </h1>
            <p className="text-gray-400 font-body text-sm sm:text-base">
              {currentUser?.role === 'admin'
                ? 'Manage client relationships, context, and ongoing work.'
                : 'Your company profile, contacts, and shared information.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
            {/* View Toggle — hidden on mobile, forced to cards */}
            {isDesktop && (
              <div className="ios-segmented shrink-0">
                <button
                  onClick={() => handleViewModeChange('cards')}
                  className={`ios-segmented-btn ${viewMode === 'cards' ? 'active' : ''}`}
                >
                  <Squares2X2Icon className="h-4 w-4 inline -mt-0.5 mr-1" /> Cards
                </button>
                <button
                  onClick={() => handleViewModeChange('table')}
                  className={`ios-segmented-btn ${viewMode === 'table' ? 'active' : ''}`}
                >
                  <Bars3Icon className="h-4 w-4 inline -mt-0.5 mr-1" /> List
                </button>
              </div>
            )}

            {/* Mobile filter button */}
            {!isDesktop && (
              <button
                onClick={() => setShowFilterSheet(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.08] border border-white/10 rounded-xl text-gray-300"
              >
                <FunnelIcon className="h-5 w-5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#3aa3eb] text-white text-[10px] font-bold">{activeFilterCount}</span>
                )}
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleNewClient}
                className="btn-header-glass space-x-2 shrink-0"
              >
                <span className="btn-text-glow">Add Client</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters — desktop only, mobile uses bottom sheet */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="ios-section-header !px-1 !pb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.08] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50 focus:border-[#3aa3eb]/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="ios-section-header !px-1 !pb-1">Client State</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50 focus:border-[#3aa3eb]/50 transition-all"
            >
              <option value="all">All States</option>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="vip">VIP</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="ios-section-header !px-1 !pb-1">Industry</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50 focus:border-[#3aa3eb]/50 transition-all"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="ios-section-header !px-1 !pb-1">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50 focus:border-[#3aa3eb]/50 transition-all"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="ios-section-header !px-1 !pb-1">Sort by Date</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="w-full px-4 py-2.5 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50 focus:border-[#3aa3eb]/50 transition-all"
            >
              <option value="newest">Newest to Oldest</option>
              <option value="oldest">Oldest to Newest</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || stateFilter !== 'all' || categoryFilter !== 'all' || locationFilter !== 'all' || sortBy !== 'newest') && (
          <div className="flex flex-wrap items-center gap-2 mt-4 text-sm">
            <span className="text-gray-400">Active filters:</span>
            {searchQuery && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300 font-body">
                Search: {searchQuery}
              </span>
            )}
            {stateFilter !== 'all' && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300 font-body">
                State: {stateFilter.charAt(0).toUpperCase() + stateFilter.slice(1)}
              </span>
            )}
            {categoryFilter !== 'all' && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300 font-body">
                Category: {categoryFilter}
              </span>
            )}
            {locationFilter !== 'all' && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300 font-body">
                Location: {locationFilter}
              </span>
            )}
            {sortBy !== 'newest' && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300 font-body">
                Sort: {sortBy === 'oldest' ? 'Oldest to Newest' : 'Newest to Oldest'}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setStateFilter('all');
                setCategoryFilter('all');
                setLocationFilter('all');
                setSortBy('newest');
              }}
              className="text-[#3aa3eb] hover:text-[#4ab3fb] font-medium font-body ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Client Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div
          onClick={() => setStateFilter('all')}
          className={`glass-card rounded-xl p-6 cursor-pointer transition-all duration-300 ${stateFilter === 'all'
            ? 'border-[#3aa3eb] shadow-[0_0_15px_rgba(58,163,235,0.3)] ring-1 ring-[#3aa3eb]'
            : 'hover-glow border-white/10'
            }`}
        >
          <div className="flex items-center">
            <div className={`p-2 sm:p-3 rounded-lg ${stateFilter === 'all' ? 'bg-[#3aa3eb]' : 'bg-[#3aa3eb]/20'}`}>
              <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-gray-400 font-body truncate">Total Clients</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">{clients.length}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setStateFilter('active')}
          className={`ios-card rounded-2xl p-5 sm:p-6 cursor-pointer transition-all duration-300 ${stateFilter === 'active'
            ? 'border-[#3aa3eb]/60 ring-1 ring-[#3aa3eb]/40'
            : 'border-white/10'
            }`}
        >
          <div className="flex items-center">
            <div className={`p-2.5 sm:p-3 rounded-xl ${stateFilter === 'active' ? 'bg-[#3aa3eb]' : 'bg-[#3aa3eb]/15'}`}>
              <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-gray-400 font-body truncate">Active Clients</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">{activeClients}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setStateFilter('vip')}
          className={`ios-card rounded-2xl p-5 sm:p-6 cursor-pointer transition-all duration-300 ${stateFilter === 'vip'
            ? 'border-[#3aa3eb]/60 ring-1 ring-[#3aa3eb]/40'
            : 'border-white/10'
            }`}
        >
          <div className="flex items-center">
            <div className={`p-2.5 sm:p-3 rounded-xl ${stateFilter === 'vip' ? 'bg-[#3aa3eb]' : 'bg-[#3aa3eb]/15'}`}>
              <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-gray-400 font-body truncate">VIP Clients</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">{clients.filter(c => c.status === 'vip').length}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setStateFilter('prospect')}
          className={`ios-card rounded-2xl p-5 sm:p-6 cursor-pointer transition-all duration-300 ${stateFilter === 'prospect'
            ? 'border-[#3aa3eb]/60 ring-1 ring-[#3aa3eb]/40'
            : 'border-white/10'
            }`}
        >
          <div className="flex items-center">
            <div className={`p-2.5 sm:p-3 rounded-xl ${stateFilter === 'prospect' ? 'bg-[#3aa3eb]' : 'bg-[#3aa3eb]/15'}`}>
              <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-gray-400 font-body truncate">Prospects</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">{prospects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Display */}
      {effectiveViewMode === 'table' ? (
        <ClientTableView
          clients={filteredClients}
          isAdmin={isAdmin}
          onView={handleViewClient}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
          initialSortField="created_at"
          initialSortDirection={sortBy === 'newest' ? 'desc' : 'asc'}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredClients.map((client) => {
            const statusInfo = statusConfig[client.status as keyof typeof statusConfig] || statusConfig.active;

            return (
              <div key={client.id} className="ios-card rounded-2xl p-4 sm:p-6 transition-all duration-300 group relative">
                {/* Background Glow Effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#3aa3eb]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-2xl"></div>

                {/* Header Section */}
                <div className="mb-5 sm:mb-6 relative z-10">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight uppercase truncate mb-1 font-display">
                      {client.company || client.name}
                    </h3>
                    <p className="text-gray-400 text-sm font-body mb-3 truncate">
                      {client.name}
                    </p>

                    <div className="flex flex-wrap gap-2 items-center">
                      {['prospect', 'active', 'vip'].includes(client.status) && (
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: statusInfo.color.split(' ')[0],
                            border: `1px solid ${statusInfo.color.split(' ')[2].replace('border-', '')}`,
                            color: 'white'
                          }}
                        >
                          {statusInfo.label}
                        </span>
                      )}
                      {client.category && <CategoryBadge category={client.category} />}
                      {client.location && (
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#ffffff'
                          }}
                        >
                          {client.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info Section */}
                <div className="ios-list rounded-2xl mb-5 relative z-10">
                  {/* Email */}
                  <a href={`mailto:${client.email}`} className="ios-row group/item cursor-pointer">
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 group-hover/item:text-[#3aa3eb] transition-colors shrink-0" />
                      <span className="text-sm text-gray-200 group-hover/item:text-white truncate font-body">
                        {client.email}
                      </span>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-gray-600 group-hover/item:text-gray-400 transition-colors shrink-0" />
                  </a>

                  {/* Phone */}
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="ios-row group/item cursor-pointer">
                      <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                        <PhoneIcon className="h-5 w-5 text-gray-400 group-hover/item:text-[#3aa3eb] transition-colors shrink-0" />
                        <span className="text-sm text-gray-200 group-hover/item:text-white truncate font-body">
                          {formatPhoneNumber(client.phone)}
                        </span>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-gray-600 group-hover/item:text-gray-400 transition-colors shrink-0" />
                    </a>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10 gap-2">
                  <span className="text-xs text-gray-500 font-body truncate">
                    Added {formatAppDate(client.created_at)}
                  </span>
                  <OverflowMenu client={client} isAdmin={isAdmin} onView={handleViewClient} onEdit={handleEditClient} onDelete={handleDeleteClient} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredClients.length === 0 && clients.length > 0 && (
        <div className="ios-card rounded-2xl p-12 text-center">
          <UserGroupIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2 font-display uppercase tracking-wide">No clients match your filters</h3>
          <p className="text-gray-400 mb-6 font-body">
            Try adjusting your search or filter criteria to see more results.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStateFilter('all');
              setCategoryFilter('all');
              setLocationFilter('all');
              setSortBy('newest');
            }}
            className="btn-primary shrink-glow-button"
          >
            Clear Filters
          </button>
        </div>
      )}

      {clients.length === 0 && (
        <div className="ios-card rounded-2xl p-12 text-center">
          <UserGroupIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2 font-display uppercase tracking-wide">
            {loading ? 'Loading clients...' : 'No clients yet'}
          </h3>
          <p className="text-gray-400 mb-6 font-body">
            {loading
              ? 'Please wait while we load your clients.'
              : 'Start by adding your first client to manage projects and relationships.'
            }
          </p>
          {isAdmin && !loading && (
            <button
              onClick={handleNewClient}
              className="btn-primary shrink-glow-button"
            >
              Add Your First Client
            </button>
          )}
        </div>
      )}

      <FilterSheet
        open={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        onApply={() => setShowFilterSheet(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        stateFilter={stateFilter}
        setStateFilter={setStateFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        uniqueCategories={uniqueCategories}
        uniqueLocations={uniqueLocations}
      />

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClient}
        client={selectedClient}
        mode={modalMode}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Client"
        message={`Are you sure you want to delete "${selectedClient?.name}"? This will also delete all associated projects, invoices, proposals, and appointments. This action cannot be undone.`}
      />
    </div>
  );
}