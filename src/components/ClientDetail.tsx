import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clientService, projectService, Client as ClientType, Project } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAltIcon,
  TagIcon,
  FolderIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import ClientModal from './ClientModal';
import ConfirmDialog from './ConfirmDialog';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface ClientDetailProps {
  currentUser: User | null;
}

const socialIcons: Record<string, string> = {
  website: '🌐',
  linkedin: '💼',
  twitter: '𝕏',
  instagram: '📸',
  facebook: '👥',
  github: '💻'
};

export default function ClientDetail({ currentUser }: ClientDetailProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientType | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientType | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (id) {
      loadClientData();
    }
  }, [id]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      const [clientsData, projectsData] = await Promise.all([
        clientService.getAll(),
        projectService.getAll()
      ]);

      const foundClient = clientsData.find(c => c.id === id);
      if (foundClient) {
        setClient(foundClient);
        setSelectedClient(foundClient);
        setProjects(projectsData.filter(p => p.client_id === id));
      } else {
        navigate('/clients');
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (clientData: any) => {
    try {
      await clientService.update(id!, clientData);
      await loadClientData();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Error updating client. Please try again.');
    }
  };

  const handleDeleteClient = async () => {
    try {
      await clientService.delete(id!);
      navigate('/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error deleting client. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'inactive': return 'bg-gray-600';
      case 'prospect': return 'bg-blue-600';
      case 'archived': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'VIP': return 'bg-yellow-600 text-yellow-100';
      case 'Active': return 'bg-green-600 text-green-100';
      case 'Lead': return 'bg-blue-600 text-blue-100';
      case 'Past': return 'bg-gray-600 text-gray-300';
      default: return 'bg-gray-600 text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="space-y-6 pb-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        <span>Back to Clients</span>
      </button>

      {/* Header Card */}
      <div className="glass-card rounded-2xl p-8">
        <div className="flex flex-col gap-4 mb-6 min-w-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4 min-w-0 sm:items-center sm:gap-6">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#3aa3eb] to-[#2d8bc7] flex items-center justify-center overflow-hidden">
              {client.company ? (
                <span className="text-3xl font-bold text-white">
                  {client.company.charAt(0).toUpperCase()}
                </span>
              ) : (
                <UserIcon className="h-12 w-12 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-4xl font-bold text-white mb-2 min-w-0 truncate" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                {client.company || client.name}
              </h1>
              <div className="flex items-center gap-3 min-w-0">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                <span className="text-xl text-gray-300 min-w-0 truncate">{client.name}</span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(client.status || 'active')} text-white`}>
                {(client.status || 'active').charAt(0).toUpperCase() + (client.status || 'active').slice(1)}
              </span>
              <button
                onClick={() => {
                  setSelectedClient(client);
                  setIsEditModalOpen(true);
                }}
                className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <PencilIcon className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="p-3 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition-colors"
              >
                <TrashIcon className="h-5 w-5 text-red-400" />
              </button>
            </div>
          )}
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/30 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FolderIcon className="h-4 w-4 text-[#3aa3eb]" />
              <span className="text-xs text-gray-400">Projects</span>
            </div>
            <p className="text-2xl font-bold text-white">{projects.length}</p>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DocumentTextIcon className="h-4 w-4 text-[#3aa3eb]" />
              <span className="text-xs text-gray-400">Status</span>
            </div>
            <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
              client.status === 'active' ? 'bg-green-600/20 text-green-300' :
              client.status === 'prospect' ? 'bg-blue-600/20 text-blue-300' :
              client.status === 'inactive' ? 'bg-gray-600/20 text-gray-300' :
              'bg-red-600/20 text-red-300'
            }`}>
              {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
            </span>
          </div>

          {client.client_tier && (
            <div className="bg-slate-800/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TagIcon className="h-4 w-4 text-[#3aa3eb]" />
                <span className="text-xs text-gray-400">Tier</span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${getTierColor(client.client_tier)}`}>
                {client.client_tier}
              </span>
            </div>
          )}

          {client.category && (
            <div className="bg-slate-800/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <BuildingOfficeIcon className="h-4 w-4 text-[#3aa3eb]" />
                <span className="text-xs text-gray-400">Industry</span>
              </div>
              <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-medium bg-slate-700/50 text-gray-300 border border-slate-600/50">
                {client.category}
              </span>
            </div>
          )}

          {client.location && (
            <div className="bg-slate-800/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <MapPinIcon className="h-4 w-4 text-[#3aa3eb]" />
                <span className="text-xs text-gray-400">Location</span>
              </div>
              <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-medium bg-slate-700/50 text-gray-300 border border-slate-600/50">
                {client.location}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <EnvelopeIcon className="h-6 w-6 mr-2 text-[#3aa3eb]" />
              Contact Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
                  <EnvelopeIcon className="h-5 w-5 text-[#3aa3eb]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Email</p>
                  <a href={`mailto:${client.email}`} className="text-white hover:text-[#3aa3eb] transition-colors break-all">
                    {client.email}
                  </a>
                </div>
              </div>

              {client.phone && (
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
                    <PhoneIcon className="h-5 w-5 text-[#3aa3eb]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Phone</p>
                    <a href={`tel:${client.phone}`} className="text-white hover:text-[#3aa3eb] transition-colors">
                      {client.phone}
                    </a>
                  </div>
                </div>
              )}

              {(client.address || client.location) && (
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
                    <MapPinIcon className="h-5 w-5 text-[#3aa3eb]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Location</p>
                    <p className="text-white break-words">{client.location || client.address}</p>
                  </div>
                </div>
              )}

              {client.website && (
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
                    <GlobeAltIcon className="h-5 w-5 text-[#3aa3eb]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Website</p>
                    <a
                      href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-[#3aa3eb] transition-colors break-all"
                    >
                      {client.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Services Requested */}
          {client.services_requested && client.services_requested.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Services Requested</h2>
              <div className="flex flex-wrap gap-2">
                {client.services_requested.map((service, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-[#3aa3eb]/20 border border-[#3aa3eb]/30 rounded-lg text-[#3aa3eb] text-sm font-medium"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Projects Section */}
          {projects.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <FolderIcon className="h-6 w-6 mr-2 text-[#3aa3eb]" />
                Projects ({projects.length})
              </h2>
              <div className="space-y-3">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="w-full p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl transition-all text-left border border-transparent hover:border-[#3aa3eb]/30"
                  >
                    <div className="flex flex-col gap-2 mb-2 min-w-0 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-bold text-white min-w-0 truncate">{project.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 self-start sm:self-auto ${
                        project.status === 'completed' ? 'bg-green-600/20 text-green-300' :
                        project.status === 'in_progress' ? 'bg-blue-600/20 text-blue-300' :
                        project.status === 'on_hold' ? 'bg-yellow-600/20 text-yellow-300' :
                        'bg-gray-600/20 text-gray-300'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#3aa3eb] to-[#2d8bc7] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Details */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Details</h2>
            <div className="space-y-4">
              {client.source && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Source</p>
                  <p className="text-white break-words">{client.source}</p>
                </div>
              )}

              {client.service_type && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Service Type</p>
                  <span className="inline-block px-3 py-1 bg-slate-800/50 rounded-lg text-sm text-white break-words">
                    {client.service_type}
                  </span>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 mb-1">Created</p>
                <div className="flex items-center space-x-2 text-white">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span>{formatAppDate(client.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Links - Only show if any exist */}
          {(client.website || client.linkedin || client.twitter || client.instagram || client.facebook || client.github) && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Social Links</h2>
              <div className="space-y-3">
                {client.website && (
                  <a
                    href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-all group min-w-0"
                  >
                    <span className="text-2xl">{socialIcons.website}</span>
                    <span className="text-white group-hover:text-[#3aa3eb] transition-colors min-w-0 truncate">Website</span>
                  </a>
                )}

                {client.linkedin && (
                  <a
                    href={client.linkedin.startsWith('http') ? client.linkedin : `https://linkedin.com/in/${client.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-all group min-w-0"
                  >
                    <span className="text-2xl">{socialIcons.linkedin}</span>
                    <span className="text-white group-hover:text-[#3aa3eb] transition-colors min-w-0 truncate">LinkedIn</span>
                  </a>
                )}

                {client.twitter && (
                  <a
                    href={client.twitter.startsWith('http') ? client.twitter : `https://twitter.com/${client.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-all group min-w-0"
                  >
                    <span className="text-2xl">{socialIcons.twitter}</span>
                    <span className="text-white group-hover:text-[#3aa3eb] transition-colors min-w-0 truncate">Twitter/X</span>
                  </a>
                )}

                {client.instagram && (
                  <a
                    href={client.instagram.startsWith('http') ? client.instagram : `https://instagram.com/${client.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-all group min-w-0"
                  >
                    <span className="text-2xl">{socialIcons.instagram}</span>
                    <span className="text-white group-hover:text-[#3aa3eb] transition-colors min-w-0 truncate">Instagram</span>
                  </a>
                )}

                {client.facebook && (
                  <a
                    href={client.facebook.startsWith('http') ? client.facebook : `https://facebook.com/${client.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-all group min-w-0"
                  >
                    <span className="text-2xl">{socialIcons.facebook}</span>
                    <span className="text-white group-hover:text-[#3aa3eb] transition-colors min-w-0 truncate">Facebook</span>
                  </a>
                )}

                {client.github && (
                  <a
                    href={client.github.startsWith('http') ? client.github : `https://github.com/${client.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-all group min-w-0"
                  >
                    <span className="text-2xl">{socialIcons.github}</span>
                    <span className="text-white group-hover:text-[#3aa3eb] transition-colors min-w-0 truncate">GitHub</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Notes</h2>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">{client.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveClient}
        client={selectedClient || client || undefined}
        mode="edit"
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteClient}
        title="Delete Client"
        message={`Are you sure you want to delete ${client.company || client.name}? This action cannot be undone.`}
      />
    </div>
  );
}
