import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserGroupIcon, 
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import ClientModal from './ClientModal';
import ConfirmDialog from './ConfirmDialog';
import { clientService, Client } from '../lib/supabase';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface ClientsProps {
  currentUser: User | null;
}

const statusConfig = {
  active: { color: 'bg-green-900/30 text-green-400', label: 'Active' },
  inactive: { color: 'bg-gray-900/30 text-gray-400', label: 'Inactive' },
  prospect: { color: 'bg-blue-900/30 text-blue-400', label: 'Prospect' },
};

export default function Clients({ currentUser }: ClientsProps) {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

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
      <div className="glass-card neon-glow rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>Clients</h1>
            <p className="text-gray-300">Manage your client relationships and information</p>
          </div>
          {isAdmin && (
            <button 
              onClick={handleNewClient}
              className="btn-primary text-white font-medium flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add Client
            </button>
          )}
        </div>
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
              <p className="text-2xl font-bold text-white">{clients.filter(c => c.company).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {clients.map((client) => {
          const statusInfo = statusConfig[client.status];
          
          return (
            <div key={client.id} className="glass-card rounded-xl p-6 card-hover neon-glow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-lg bg-slate-700">
                    <UserGroupIcon className="h-6 w-6 text-[#3aa3eb]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>{client.name}</h3>
                    {client.company && (
                      <p className="text-sm text-gray-400">{client.company}</p>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
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

              {client.notes && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{client.notes}</p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <span className="text-xs text-gray-400">
                  Added {new Date(client.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      alert(`Client Details:\n\nName: ${client.name}\nEmail: ${client.email}\nCompany: ${client.company || 'N/A'}\nPhone: ${client.phone || 'N/A'}\nStatus: ${client.status}\n\nNotes: ${client.notes || 'No notes'}`);
                    }}
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
          {isAdmin && (
            <button 
              onClick={handleNewClient}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Add Your First Client'}
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