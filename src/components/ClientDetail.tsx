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
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import ClientModal from './ClientModal';
import ConfirmDialog from './ConfirmDialog';
import CategoryBadge from './CategoryBadge';

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const statusConfig = {
  active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  prospect: { label: 'Prospect', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  vip: { label: 'VIP', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  past: { label: 'Past', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  archived: { label: 'Archived', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

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
      const [foundClient, projectsData] = await Promise.all([
        clientService.getById(id!),
        projectService.getByClientId(id!)
      ]);

      if (foundClient) {
        setClient(foundClient);
        setSelectedClient(foundClient);
        setProjects(projectsData);
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
      <div className="glass-card neon-glow rounded-3xl p-8 relative overflow-hidden group border border-white/10 shadow-2xl">
        {/* Background Glow Effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

        <div className="flex flex-col gap-6 mb-8 relative z-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6 min-w-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#3aa3eb] to-[#2d8bc7] flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-blue-500/20">
              {client.company ? (
                <span className="text-4xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                  {client.company.charAt(0).toUpperCase()}
                </span>
              ) : (
                <UserIcon className="h-12 w-12 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                {client.company || client.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <BuildingOfficeIcon className="h-5 w-5 text-[#3aa3eb]" />
                  <span className="text-lg font-medium text-gray-300">{client.name}</span>
                </div>
                {client.location && (
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-white/[0.05] border border-white/20 text-white shadow-inner">
                    <MapPinIcon className="h-4 w-4 mr-2 text-blue-400" />
                    {client.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <button
              onClick={() => navigate(`/community/chat?clientId=${client.id}`)}
              className="p-3 bg-[#59a1e5]/10 hover:bg-[#59a1e5]/20 rounded-xl transition-all border border-[#59a1e5]/20 hover:border-[#59a1e5]/40 group/btn"
              title="Message Client"
            >
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-[#59a1e5] group-hover/btn:scale-110 transition-transform" />
            </button>
            <button
              onClick={() => {
                setSelectedClient(client);
                setIsEditModalOpen(true);
              }}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 hover:border-white/20 group/btn"
              title="Edit Client"
            >
              <PencilIcon className="h-6 w-6 text-white group-hover/btn:scale-110 transition-transform" />
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="p-3 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/20 hover:border-rose-500/30 group/btn"
                title="Delete Client"
              >
                <TrashIcon className="h-6 w-6 text-rose-400 group-hover/btn:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-blue-500/20 rounded-lg">
                <FolderIcon className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Projects</span>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight leading-none" style={{ fontFamily: 'Integral CF, sans-serif' }}>
              {projects.length}
            </p>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                <DocumentTextIcon className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">State</span>
            </div>
            {(() => {
              const statusInfo = statusConfig[client.status as keyof typeof statusConfig] || statusConfig.active;
              return (
                <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border ${statusInfo.color}`}>
                  <span className="w-1.5 h-1.5 rounded-full mr-2 bg-current opacity-80 animate-pulse"></span>
                  {statusInfo.label}
                </span>
              );
            })()}
          </div>

          {client.client_tier && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center space-x-2 mb-3">
                <div className="p-1.5 bg-purple-500/20 rounded-lg">
                  <TagIcon className="h-4 w-4 text-purple-400" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tier</span>
              </div>
              <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {client.client_tier}
              </span>
            </div>
          )}

          {client.category && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center space-x-2 mb-3">
                <div className="p-1.5 bg-amber-500/20 rounded-lg">
                  <BuildingOfficeIcon className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Industry</span>
              </div>
              <div className="scale-110 origin-left">
                <CategoryBadge category={client.category} />
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a href={`mailto:${client.email}`} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-blue-500/30 transition-all group/item">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover/item:bg-blue-500/20 transition-colors">
                    <EnvelopeIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Email</p>
                    <p className="text-white group-hover:text-blue-300 transition-colors truncate font-semibold">
                      {client.email}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white transition-colors" />
              </a>

              {client.phone && (
                <a href={`tel:${client.phone}`} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-emerald-500/30 transition-all group/item">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover/item:bg-emerald-500/20 transition-colors">
                      <PhoneIcon className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Phone</p>
                      <p className="text-white group-hover:text-emerald-300 transition-colors truncate font-semibold">
                        {formatPhoneNumber(client.phone)}
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white transition-colors" />
                </a>
              )}

              {client.website && (
                <a
                  href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-purple-500/30 transition-all group/item"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20 group-hover/item:bg-purple-500/20 transition-colors">
                      <GlobeAltIcon className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Website</p>
                      <p className="text-white group-hover:text-purple-300 transition-colors truncate font-semibold">
                        {client.website.replace('https://', '').replace('http://', '')}
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white transition-colors" />
                </a>
              )}

              {client.location && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all group/item">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                      <MapPinIcon className="h-6 w-6 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Address</p>
                      <p className="text-white truncate font-semibold">
                        {client.address || client.location}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Services Requested */}
          {client.services_requested && client.services_requested.length > 0 && (
            <div className="glass-card rounded-2xl p-6 group">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <TagIcon className="h-6 w-6 mr-2 text-blue-400" />
                Services Requested
              </h2>
              <div className="flex flex-wrap gap-2">
                {client.services_requested.map((service, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-xl text-sm font-semibold text-gray-200 hover:text-white hover:border-slate-500 transition-all cursor-default"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Projects Section */}
          {projects.length > 0 && (
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
                  <FolderIcon className="h-5 w-5 text-blue-400" />
                </div>
                Active Projects
                <span className="ml-3 px-2 py-0.5 bg-blue-500/20 rounded-md text-xs font-bold text-blue-400">
                  {projects.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="w-full p-5 bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-blue-500/30 rounded-2xl transition-all text-left flex flex-col gap-4 group/item"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg text-white group-hover/item:text-blue-300 transition-colors truncate mb-1">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Progress</p>
                          <span className="text-xs font-bold text-blue-400">{project.progress}%</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        project.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          project.status === 'on_hold' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800/50 rounded-full h-2 relative overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 group-hover/item:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
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
          <div className="glass-card rounded-2xl p-6 group">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-400" />
              General Details
            </h2>
            <div className="space-y-5">
              {client.source && (
                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Acquisition Source</p>
                  <p className="text-sm font-semibold text-white break-words">{client.source}</p>
                </div>
              )}

              {client.service_type && (
                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Primary Service</p>
                  <span className="inline-block px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold">
                    {client.service_type}
                  </span>
                </div>
              )}

              <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Partnership Since</p>
                <div className="flex items-center space-x-2 text-white">
                  <CalendarIcon className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold">{formatAppDate(client.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Links - Only show if any exist */}
          {(client.website || client.linkedin || client.twitter || client.instagram || client.facebook || client.github) && (
            <div className="glass-card rounded-2xl p-6 group">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <GlobeAltIcon className="h-6 w-6 mr-2 text-purple-400" />
                Social Presence
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {client.website && (
                  <a
                    href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-4 bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-blue-500/30 rounded-2xl transition-all group/link"
                  >
                    <span className="text-2xl mb-2 group-hover/link:scale-125 transition-transform">{socialIcons.website}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Website</span>
                  </a>
                )}

                {client.linkedin && (
                  <a
                    href={client.linkedin.startsWith('http') ? client.linkedin : `https://linkedin.com/in/${client.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-4 bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-blue-600/30 rounded-2xl transition-all group/link"
                  >
                    <span className="text-2xl mb-2 group-hover/link:scale-125 transition-transform">{socialIcons.linkedin}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">LinkedIn</span>
                  </a>
                )}

                {client.twitter && (
                  <a
                    href={client.twitter.startsWith('http') ? client.twitter : `https://twitter.com/${client.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-4 bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-blue-400/30 rounded-2xl transition-all group/link"
                  >
                    <span className="text-2xl mb-2 group-hover/link:scale-125 transition-transform">{socialIcons.twitter}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Twitter/X</span>
                  </a>
                )}

                {client.instagram && (
                  <a
                    href={client.instagram.startsWith('http') ? client.instagram : `https://instagram.com/${client.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-4 bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-pink-500/30 rounded-2xl transition-all group/link"
                  >
                    <span className="text-2xl mb-2 group-hover/link:scale-125 transition-transform">{socialIcons.instagram}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Instagram</span>
                  </a>
                )}

                {client.facebook && (
                  <a
                    href={client.facebook.startsWith('http') ? client.facebook : `https://facebook.com/${client.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-4 bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-blue-500/30 rounded-2xl transition-all group/link"
                  >
                    <span className="text-2xl mb-2 group-hover/link:scale-125 transition-transform">{socialIcons.facebook}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Facebook</span>
                  </a>
                )}

                {client.github && (
                  <a
                    href={client.github.startsWith('http') ? client.github : `https://github.com/${client.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-4 bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-slate-400/30 rounded-2xl transition-all group/link"
                  >
                    <span className="text-2xl mb-2 group-hover/link:scale-125 transition-transform">{socialIcons.github}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">GitHub</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl p-6 bg-amber-500/[0.02] border-amber-500/10 hover:bg-amber-500/[0.05] transition-all duration-500">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <DocumentTextIcon className="h-6 w-6 mr-2 text-amber-400" />
              Internal Notes
            </h2>
            <div className="relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/20 rounded-full"></div>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words pl-4 italic">
                {client.notes}
              </p>
            </div>
          </div>
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
