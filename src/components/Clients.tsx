import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useLoadingGuard } from '../hooks/useLoadingGuard';
import {
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  Squares2X2Icon,
  Bars3Icon,
  MagnifyingGlassIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import ClientModal from './ClientModal';
import ConfirmDialog from './ConfirmDialog';
import ClientTableView from './ClientTableView';
import CategoryBadge from './CategoryBadge';
import { clientService, Client, UserRole } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import { formatPhoneNumber } from '../lib/phoneFormat';

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
  prospect: { color: 'bg-green-900/30 text-green-400', label: 'Prospect' },
  active: { color: 'bg-green-900/30 text-green-400', label: 'Active' },
  vip: { color: 'bg-purple-900/30 text-purple-400', label: 'VIP' },
  past: { color: 'bg-gray-900/30 text-gray-400', label: 'Past' },
  archived: { color: 'bg-amber-900/30 text-amber-300', label: 'Archived' },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

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
  });

  const uniqueCategories = Array.from(new Set(clients.map(c => c.category).filter(Boolean)));
  const uniqueLocations = Array.from(new Set(clients.map(c => c.location).filter(Boolean)));


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
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>Clients</h1>
            <p className="text-gray-300">Manage your client relationships and information</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
            {/* View Toggle */}
            <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg p-1 shrink-0">
              <button
                onClick={() => handleViewModeChange('cards')}
                className={`p-2 rounded transition-colors ${viewMode === 'cards'
                  ? 'bg-[#3aa3eb] text-white'
                  : 'text-gray-400 hover:text-white'
                  }
                shrink-glow-button
                `}
                title="Card View"
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleViewModeChange('table')}
                className={`p-2 rounded transition-colors ${viewMode === 'table'
                  ? 'bg-[#3aa3eb] text-white'
                  : 'text-gray-400 hover:text-white'
                  }
                shrink-glow-button
                `}
                title="Table View"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={handleNewClient}
                className="btn-primary text-white font-medium flex items-center space-x-2 shrink-glow-button shrink-0"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Client</span>
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Client State</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
            >
              <option value="all">All States</option>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="vip">VIP</option>
              <option value="past">Past</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Industry</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || stateFilter !== 'all' || categoryFilter !== 'all' || locationFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 mt-4 text-sm">
            <span className="text-gray-400">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                Search: {searchQuery}
              </span>
            )}
            {stateFilter !== 'all' && (
              <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                State: {stateFilter.charAt(0).toUpperCase() + stateFilter.slice(1)}
              </span>
            )}
            {categoryFilter !== 'all' && (
              <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                Category: {categoryFilter}
              </span>
            )}
            {locationFilter !== 'all' && (
              <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                Location: {locationFilter}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setStateFilter('all');
                setCategoryFilter('all');
                setLocationFilter('all');
              }}
              className="text-[#3aa3eb] hover:text-blue-300 font-medium shrink-glow-button"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Client Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          onClick={() => setStateFilter('all')}
          className={`glass-card rounded-xl p-6 cursor-pointer transition-all duration-300 ${stateFilter === 'all'
            ? 'border-[#3aa3eb] shadow-[0_0_15px_rgba(58,163,235,0.3)] ring-1 ring-[#3aa3eb]'
            : 'hover-glow border-white/10'
            }`}
        >
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${stateFilter === 'all' ? 'bg-[#3aa3eb]' : 'bg-[#3aa3eb]/20'}`}>
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white font-medium">Total Clients</p>
              <p className="text-2xl font-bold text-white">{clients.length}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setStateFilter('active')}
          className={`glass-card rounded-xl p-6 cursor-pointer transition-all duration-300 ${stateFilter === 'active'
            ? 'border-[#3aa3eb] shadow-[0_0_15px_rgba(58,163,235,0.3)] ring-1 ring-[#3aa3eb]'
            : 'hover-glow border-white/10'
            }`}
        >
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${stateFilter === 'active' ? 'bg-[#3aa3eb]' : 'bg-[#3aa3eb]/20'}`}>
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white font-medium">Active Clients</p>
              <p className="text-2xl font-bold text-white">{activeClients}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setStateFilter('vip')}
          className={`glass-card rounded-xl p-6 cursor-pointer transition-all duration-300 ${stateFilter === 'vip'
            ? 'border-[#3aa3eb] shadow-[0_0_15px_rgba(58,163,235,0.3)] ring-1 ring-[#3aa3eb]'
            : 'hover-glow border-white/10'
            }`}
        >
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${stateFilter === 'vip' ? 'bg-[#3aa3eb]' : 'bg-[#3aa3eb]/20'}`}>
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white font-medium">VIP Clients</p>
              <p className="text-2xl font-bold text-white">{clients.filter(c => c.status === 'vip').length}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setStateFilter('prospect')}
          className={`glass-card rounded-xl p-6 cursor-pointer transition-all duration-300 ${stateFilter === 'prospect'
            ? 'border-[#3aa3eb] shadow-[0_0_15px_rgba(58,163,235,0.3)] ring-1 ring-[#3aa3eb]'
            : 'hover-glow border-white/10'
            }`}
        >
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${stateFilter === 'prospect' ? 'bg-[#3aa3eb]' : 'bg-[#3aa3eb]/20'}`}>
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white font-medium">Prospects</p>
              <p className="text-2xl font-bold text-white">{prospects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Display */}
      {viewMode === 'table' ? (
        <ClientTableView
          clients={filteredClients}
          isAdmin={isAdmin}
          onView={handleViewClient}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const statusInfo = statusConfig[client.status as keyof typeof statusConfig] || statusConfig.active;

            return (
              <div key={client.id} className="glass-card hover-glow rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 group border border-white/10 relative overflow-hidden">
                {/* Background Glow Effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Header Section */}
                <div className="mb-8 relative z-10">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white tracking-wide uppercase truncate mb-1" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                      {client.company || client.name}
                    </h3>
                    <p className="text-gray-300 text-sm font-semibold mb-3 truncate">
                      {client.name}
                    </p>

                    <div className="flex flex-wrap gap-2 items-center">
                      {['prospect', 'active', 'vip'].includes(client.status) && (
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: statusInfo.color.split(' ')[0],
                            border: `1px solid ${statusInfo.color.split(' ')[1].replace('text-', '')}`,
                            color: statusInfo.color.split(' ')[1].replace('text-', '')
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full mr-2"
                            style={{
                              backgroundColor: statusInfo.color.split(' ')[1].replace('text-', '')
                            }}
                          ></span>
                          {statusInfo.label}
                        </span>
                      )}
                      {client.category && <CategoryBadge category={client.category} />}
                      {client.location && (
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.33)',
                            border: '1px solid rgba(255, 255, 255, 1)',
                            color: 'white'
                          }}
                        >
                          {client.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info Section */}
                <div className="space-y-3 mb-6 relative z-10">
                  {/* Email */}
                  <a href={`mailto:${client.email}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group/item cursor-pointer">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <EnvelopeIcon className="h-5 w-5 text-gray-300 group-hover/item:text-white transition-colors shrink-0" />
                      <span className="text-sm text-gray-200 group-hover/item:text-white truncate font-semibold">
                        {client.email}
                      </span>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-gray-600 group-hover/item:text-white transition-colors" />
                  </a>

                  {/* Phone */}
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group/item cursor-pointer">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <PhoneIcon className="h-5 w-5 text-gray-300 group-hover/item:text-white transition-colors shrink-0" />
                        <span className="text-sm text-gray-200 group-hover/item:text-white truncate font-semibold">
                          {formatPhoneNumber(client.phone)}
                        </span>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-gray-600 group-hover/item:text-white transition-colors" />
                    </a>
                  )}
                </div>

                {/* Services Section */}
                <div className="mb-6 relative z-10">
                  {client.services_requested && client.services_requested.length > 0 ? (
                    <>
                      <h4 className="text-sm font-medium text-white mb-3">Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {client.services_requested.map((service, idx) => (
                          <span key={idx} className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-xs text-gray-200 hover:text-white hover:border-slate-600 transition-colors cursor-default font-medium">
                            {service}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-4"></div> /* Spacer to maintain height consistency if no services */
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                  <span className="text-xs text-gray-400 font-semibold">
                    Added {formatAppDate(client.created_at)}
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleViewClient(client); }}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                      title="View Details"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditClient(client); }}
                          className="text-gray-400 hover:text-[#3aa3eb] transition-colors p-1"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClient(client); }}
                          className="text-gray-400 hover:text-red-400 transition-colors p-1"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredClients.length === 0 && clients.length > 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No clients match your filters</h3>
          <p className="text-gray-400 mb-6">
            Try adjusting your search or filter criteria to see more results.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStateFilter('all');
              setCategoryFilter('all');
              setLocationFilter('all');
            }}
            className="btn-primary shrink-glow-button"
          >
            Clear Filters
          </button>
        </div>
      )}

      {clients.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">
            {loading ? 'Loading clients...' : 'No clients yet'}
          </h3>
          <p className="text-gray-400 mb-6">
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