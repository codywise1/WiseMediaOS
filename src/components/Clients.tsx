import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useLoadingGuard } from '../hooks/useLoadingGuard';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  Squares2X2Icon,
  Bars3Icon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import ClientModal from './ClientModal';
import ConfirmDialog from './ConfirmDialog';
import ClientTableView from './ClientTableView';
import CategoryBadge from './CategoryBadge';
import ServiceTag from './ServiceTag';
import { clientService, Client, UserRole } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface ClientsProps {
  currentUser: User | null;
}

const statusConfig: Record<'active' | 'inactive' | 'prospect' | 'archived', { color: string; label: string }> = {
  active: { color: 'bg-green-900/30 text-green-400', label: 'Active' },
  inactive: { color: 'bg-gray-900/30 text-gray-400', label: 'Inactive' },
  prospect: { color: 'bg-blue-900/30 text-blue-400', label: 'Prospect' },
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  useLoadingGuard(loading, setLoading);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.getAll();
      setClients(data);
      console.log('Clients loaded:', data.length);
    } catch (error) {
      console.error('Error loading clients:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error loading clients: ${errorMessage}\n\nUsing offline mode.`);
      // Set empty array as fallback
      setClients([]);
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
        alert('Name and email are required fields.');
        setLoading(false);
        return;
      }
      
      if (modalMode === 'create') {
        const newClient = await clientService.create(clientData);
        console.log('Client created:', newClient);
        setClients(prevClients => [...prevClients, newClient]);
        setIsModalOpen(false);
        alert('Client created successfully!');
      } else if (selectedClient) {
        const updatedClient = await clientService.update(selectedClient.id, clientData);
        console.log('Client updated:', updatedClient);
        setClients(prevClients => 
          prevClients.map(c => c.id === selectedClient.id ? updatedClient : c)
        );
        setIsModalOpen(false);
        alert('Client updated successfully!');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        alert('A client with this email already exists. Please use a different email address.');
      } else if (errorMessage.includes('Database error')) {
        alert(`Database error: ${errorMessage}\n\nPlease check your Supabase connection.`);
      } else {
        alert(`Error saving client: ${errorMessage}`);
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

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.company?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.first_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || client.category === categoryFilter;
    const matchesLocation = locationFilter === 'all' || client.location === locationFilter;

    return matchesSearch && matchesCategory && matchesLocation;
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
  const companiesCount = clients.filter(c => c.company).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>Clients</h1>
            <p className="text-gray-300">Manage your client relationships and information</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Toggle */}
            <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => handleViewModeChange('cards')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-[#3aa3eb] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Card View"
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleViewModeChange('table')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[#3aa3eb] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Table View"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={handleNewClient}
                className="btn-primary text-white font-medium flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Client</span>
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
          >
            <option value="all">All Locations</option>
            {uniqueLocations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || categoryFilter !== 'all' || locationFilter !== 'all') && (
          <div className="flex items-center space-x-2 mt-4 text-sm">
            <span className="text-gray-400">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                Search: {searchQuery}
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
                setCategoryFilter('all');
                setLocationFilter('all');
              }}
              className="text-[#3aa3eb] hover:text-blue-300 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Client Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Total Clients</p>
              <p className="text-2xl font-bold text-white">{clients.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Active Clients</p>
              <p className="text-2xl font-bold text-white">{activeClients}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Prospects</p>
              <p className="text-2xl font-bold text-white">{prospects}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <BuildingOfficeIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Companies</p>
              <p className="text-2xl font-bold text-white">{companiesCount}</p>
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
              <div key={client.id} className="glass-card rounded-xl p-6 card-hover neon-glow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-lg bg-slate-700">
                      <UserGroupIcon className="h-6 w-6 text-[#3aa3eb]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                        {client.company || client.name}
                      </h3>
                      {client.name && (
                        <p className="text-sm text-gray-400">{client.name}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Category and Location */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {client.category && <CategoryBadge category={client.category} />}
                  {client.location && (
                    <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-700 text-gray-300">
                      {client.location}
                    </span>
                  )}
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center space-x-2">
                      <PhoneIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{client.phone}</span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center space-x-2">
                      <GlobeAltIcon className="h-4 w-4 text-gray-400" />
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        {client.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Services Requested */}
                {client.services_requested && client.services_requested.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-2">Services Requested:</p>
                    <div className="flex flex-wrap gap-1">
                      {client.services_requested.map((service, idx) => (
                        <ServiceTag key={idx} service={service} />
                      ))}
                    </div>
                  </div>
                )}

                {client.notes && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{client.notes}</p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <span className="text-xs text-gray-400">
                    Added {formatAppDate(client.created_at)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewClient(client)}
                      className="text-white hover:text-blue-300 p-1"
                      title="View Client"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleEditClient(client)}
                          className="text-blue-500 hover:text-white p-1"
                          title="Edit Client"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="text-blue-500 hover:text-red-400 p-1"
                          title="Delete Client"
                        >
                          <TrashIcon className="h-4 w-4" />
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
              setCategoryFilter('all');
              setLocationFilter('all');
            }}
            className="btn-primary"
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
              className="btn-primary"
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