import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clientService, projectService, invoiceService, Client as ClientType, Project } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
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

const extractSocialHandle = (raw: string) => {
  let value = raw.trim();
  value = value.replace(/^@+/, '');

  const looksLikeUrl = /^https?:\/\//i.test(value);
  const looksLikeDomain = /(instagram\.com|twitter\.com|x\.com|linkedin\.com|facebook\.com|tiktok\.com)/i.test(value);

  if (looksLikeUrl || looksLikeDomain) {
    try {
      const url = new URL(looksLikeUrl ? value : `https://${value}`);
      value = url.pathname;
    } catch {
      // ignore
    }
  }

  value = value.split('?')[0].split('#')[0];
  value = value.replace(/^\/+|\/+$/g, '');
  if (!value) return '';

  const parts = value.split('/').filter(Boolean);
  const first = parts[0] || '';

  if (first === 'channel' || first === 'c' || first === 'user') return (parts[1] || '').replace(/^@+/, '');
  if (first === 'in' || first === 'company' || first === 'school') return (parts[1] || '').replace(/^@+/, '');

  return first.replace(/^@+/, '');
};

const buildWebsiteUrl = (raw: string) => {
  const value = raw.trim();
  if (!value) return '#';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/\//, '')}`;
};

const displayWebsite = (raw: string) => {
  const value = raw.trim();
  if (!value) return 'Website';
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.replace(/^www\./i, '');
  } catch {
    return value.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  }
};

const buildLinkedInUrl = (raw: string) => {
  const value = raw.trim();
  if (!value) return 'https://linkedin.com';
  if (/^https?:\/\//i.test(value)) return value;
  if (/linkedin\.com/i.test(value)) return `https://${value.replace(/^\/\//, '')}`;
  const handle = extractSocialHandle(value);
  return handle ? `https://linkedin.com/in/${handle}` : 'https://linkedin.com';
};

const buildTwitterUrl = (raw: string) => {
  const value = raw.trim();
  if (!value) return 'https://x.com';
  if (/^https?:\/\//i.test(value)) return value;
  if (/(twitter\.com|x\.com)/i.test(value)) return `https://${value.replace(/^\/\//, '')}`;
  const handle = extractSocialHandle(value);
  return handle ? `https://x.com/${handle}` : 'https://x.com';
};

const buildFacebookUrl = (raw: string) => {
  const value = raw.trim();
  if (!value) return 'https://facebook.com';
  if (/^https?:\/\//i.test(value)) return value;
  if (/facebook\.com/i.test(value)) return `https://${value.replace(/^\/\//, '')}`;
  const handle = extractSocialHandle(value);
  return handle ? `https://facebook.com/${handle}` : 'https://facebook.com';
};

const buildTikTokUrl = (raw: string) => {
  const value = raw.trim();
  if (!value) return 'https://tiktok.com';
  if (/^https?:\/\//i.test(value)) return value;
  if (/tiktok\.com/i.test(value)) return `https://${value.replace(/^\/\//, '')}`;
  const handle = extractSocialHandle(value);
  return handle ? `https://tiktok.com/@${handle}` : 'https://tiktok.com';
};

const buildGitHubUrl = (raw: string) => {
  const value = raw.trim();
  if (!value) return 'https://github.com';
  if (/^https?:\/\//i.test(value)) return value;
  if (/github\.com/i.test(value)) return `https://${value.replace(/^\/\//, '')}`;
  const handle = extractSocialHandle(value);
  return handle ? `https://github.com/${handle}` : 'https://github.com';
};

const buildInstagramUrl = (raw: string) => {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/instagram\.com/i.test(value)) return `https://${value.replace(/^\/\//, '')}`;
  const handle = extractSocialHandle(value);
  return handle ? `https://instagram.com/${handle.replace(/^@/, '')}` : 'https://instagram.com';
};

const buildYouTubeUrl = (raw: string) => {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/(youtube\.com|youtu\.be)/i.test(value)) return `https://${value.replace(/^\/\//, '')}`;
  const handle = extractSocialHandle(value);
  if (!handle) return 'https://youtube.com';
  if (/^UC[\w-]{10,}$/i.test(handle)) return `https://youtube.com/channel/${handle}`;
  return `https://youtube.com/@${handle}`;
};

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface ClientDetailProps {
  currentUser: User | null;
}

export default function ClientDetail({ currentUser }: ClientDetailProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientType | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientType | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
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
      const [foundClient, projectsData, invoicesData] = await Promise.all([
        clientService.getById(id!),
        projectService.getByClientId(id!),
        invoiceService && typeof (invoiceService as any).getByClientId === 'function'
          ? (invoiceService as any).getByClientId(id!)
          : Promise.resolve([])
      ]);

      if (foundClient) {
        setClient(foundClient);
        setSelectedClient(foundClient);
        setProjects(projectsData);
        setInvoices(invoicesData);
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
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="text-sm font-medium">Back to Clients</span>
      </button>

      {/* Hero Section */}
      <div className="glass-card neon-glow rounded-3xl p-8 lg:p-10 relative overflow-hidden group border border-white/10 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                {client.company || client.name}
              </h1>
              <p className="text-xl text-gray-400 font-bold">{client.name}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <CategoryBadge category={client.category || 'General'} />
              {client.location && (
                <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white">
                  {client.location}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end justify-between h-full min-h-[140px] w-full md:w-auto">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedClient(client);
                  setIsEditModalOpen(true);
                }}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group/btn"
              >
                <PencilIcon className="h-5 w-5 text-gray-400 group-hover/btn:text-white" />
              </button>
              {isAdmin && (
                <button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="p-3 bg-red-500/5 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-all group/btn"
                >
                  <TrashIcon className="h-5 w-5 text-red-400/70 group-hover/btn:text-red-400" />
                </button>
              )}
            </div>

            <button
              onClick={() => navigate(`/community/chat?clientId=${client.id}`)}
              className="mt-auto px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-3 group/msg transition-all w-full md:w-auto justify-center md:justify-start"
            >
              <div className="p-1.5 bg-blue-500/20 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#3ba3ea]" />
              </div>
              <span className="text-white font-bold uppercase tracking-widest text-sm">Message</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="glass-card bg-[#0d1117] rounded-3xl p-6 border border-white/5">
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8" style={{ fontFamily: 'Integral CF, sans-serif' }}>
            Contact Information
          </h3>
          <div className="space-y-4">
            <a href={`mailto:${client.email}`} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
              <div className="flex items-center gap-4">
                <div className="p-2 border border-white/10 rounded-xl">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <span className="text-gray-300 font-medium">{client.email}</span>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
            </a>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <span className="text-gray-300 font-medium">{formatPhoneNumber(client.phone)}</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}
          </div>
        </div>

        {/* Social Links */}
        <div className="glass-card bg-[#0d1117] rounded-3xl p-6 border border-white/5">
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8" style={{ fontFamily: 'Integral CF, sans-serif' }}>
            Social Links
          </h3>
          <div className="space-y-4 max-h-[176px] overflow-y-auto pr-1 custom-scrollbar">
            {client.website && (
              <a href={buildWebsiteUrl(client.website)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <span className="text-gray-300 font-medium truncate max-w-[180px]">{displayWebsite(client.website)}</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}

            {client.linkedin && (
              <a href={buildLinkedInUrl(client.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0.5 8h4V24h-4V8zM8.5 8h3.8v2.2h.1c.5-1 1.9-2.2 4-2.2 4.3 0 5.1 2.8 5.1 6.5V24h-4v-8.2c0-2 0-4.5-2.7-4.5-2.7 0-3.1 2.1-3.1 4.3V24h-4V8z"/></svg>
                  </div>
                  <span className="text-gray-300 font-medium truncate max-w-[180px]">
                    {(() => {
                      const handle = extractSocialHandle(client.linkedin);
                      if (!handle) return 'LinkedIn';
                      return handle;
                    })()}
                  </span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}

            {client.twitter && (
              <a href={buildTwitterUrl(client.twitter)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.39l-5.01-6.48L5.4 22H2.64l7.03-8.04L1.5 2H8l4.53 5.86L18.244 2zm-1.12 18h1.77L6.96 3.9H5.06L17.12 20z"/></svg>
                  </div>
                  <span className="text-gray-300 font-medium truncate max-w-[180px]">
                    {(() => {
                      const handle = extractSocialHandle(client.twitter);
                      if (!handle) return 'X';
                      return `@${handle}`;
                    })()}
                  </span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}

            {client.instagram && (
              <a href={buildInstagramUrl(client.instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                  </div>
                  <span className="text-gray-300 font-medium truncate max-w-[180px]">
                    {(() => {
                      const handle = extractSocialHandle(client.instagram);
                      if (!handle) return 'Instagram';
                      return handle.startsWith('@') ? handle : `@${handle}`;
                    })()}
                  </span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}

            {client.facebook && (
              <a href={buildFacebookUrl(client.facebook)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24H12.82v-9.294H9.692V11.01h3.128V8.309c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.59l-.467 3.696h-3.123V24h6.126C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z"/></svg>
                  </div>
                  <span className="text-gray-300 font-medium truncate max-w-[180px]">
                    {(() => {
                      const handle = extractSocialHandle(client.facebook);
                      if (!handle) return 'Facebook';
                      return handle;
                    })()}
                  </span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}

            {client.tiktok && (
              <a href={buildTikTokUrl(client.tiktok)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.9v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.31 0 .61.05.9.14V9.02a6.71 6.71 0 0 0-.9-.06A6.71 6.71 0 0 0 2.33 15.7a6.71 6.71 0 0 0 6.71 6.71 6.71 6.71 0 0 0 6.71-6.71V9.4a8.74 8.74 0 0 0 3.84 1.01V6.69z"/></svg>
                  </div>
                  <span className="text-gray-300 font-medium truncate max-w-[180px]">
                    {(() => {
                      const handle = extractSocialHandle(client.tiktok);
                      if (!handle) return 'TikTok';
                      return `@${handle}`;
                    })()}
                  </span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}

            {client.github && (
              <a href={buildGitHubUrl(client.github)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.73.5.5 5.86.5 12.32c0 5.17 3.44 9.55 8.2 11.1.6.11.82-.27.82-.6 0-.3-.01-1.08-.02-2.12-3.34.75-4.04-1.66-4.04-1.66-.55-1.44-1.34-1.82-1.34-1.82-1.1-.78.08-.77.08-.77 1.22.09 1.86 1.29 1.86 1.29 1.08 1.9 2.83 1.35 3.52 1.03.11-.81.42-1.35.76-1.66-2.66-.31-5.46-1.37-5.46-6.1 0-1.35.46-2.45 1.23-3.31-.12-.31-.53-1.56.12-3.25 0 0 1-.33 3.3 1.26a11.1 11.1 0 0 1 3-.42c1.02 0 2.05.14 3 .42 2.3-1.59 3.3-1.26 3.3-1.26.65 1.69.24 2.94.12 3.25.77.86 1.23 1.96 1.23 3.31 0 4.74-2.8 5.78-5.47 6.09.43.38.81 1.13.81 2.28 0 1.64-.02 2.96-.02 3.36 0 .33.22.72.83.6 4.76-1.55 8.2-5.93 8.2-11.1C23.5 5.86 18.27.5 12 .5z"/></svg>
                  </div>
                  <span className="text-gray-300 font-medium truncate max-w-[180px]">
                    {(() => {
                      const handle = extractSocialHandle(client.github);
                      if (!handle) return 'GitHub';
                      return handle;
                    })()}
                  </span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}

            {client.youtube && (
              <a href={buildYouTubeUrl(client.youtube)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <span className="text-gray-300 font-medium truncate max-w-[180px]">
                    {(() => {
                      const handle = extractSocialHandle(client.youtube);
                      if (!handle) return 'YouTube';
                      if (/^UC[\w-]{10,}$/i.test(handle)) return handle;
                      return `@${handle}`;
                    })()}
                  </span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}
          </div>
        </div>

        {/* Details Metrics */}
        <div className="glass-card bg-[#0d1117] rounded-3xl p-6 border border-white/5">
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8" style={{ fontFamily: 'Integral CF, sans-serif' }}>
            Details
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 font-bold text-sm">Client State</span>
              <span className="text-white font-bold text-sm uppercase tracking-wider">{client.status}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 font-bold text-sm">Added</span>
              <span className="text-white font-bold text-sm">{formatAppDate(client.created_at)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 font-bold text-sm">Projects Completed</span>
              <span className="text-white font-bold text-sm">{projects.filter(p => p.status === 'completed').length}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 font-bold text-sm">Lifetime Value</span>
              <span className="text-white font-bold text-sm tabular-nums">
                ${projects.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Integral CF, sans-serif' }}>
              Projects ({projects.length})
            </h3>
          </div>
          <div className="space-y-4">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="w-full text-left glass-card bg-[#0d1117] hover:bg-[#161b22] border border-white/5 p-6 rounded-3xl transition-all group/project"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-white uppercase" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                      {project.name}
                    </h4>
                    <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest">
                      {project.project_type || 'Website'}
                    </span>
                  </div>
                  <span className="text-xl font-black text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                    ${(project.budget || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                    {project.status === 'completed' ? `Delivered: ${formatAppDate(project.updated_at || project.created_at)}` : 'In Progress'}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${project.status === 'completed' ? 'bg-blue-400' : 'bg-emerald-400 animate-pulse'}`}></div>
                    <span className="text-xs font-bold text-white uppercase tracking-widest">
                      {project.status === 'completed' ? 'Completed' : project.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {projects.length === 0 && (
              <div className="p-8 text-center glass-card bg-[#0d1117] border border-dashed border-white/10 rounded-3xl">
                <p className="text-gray-500 font-medium">No projects found for this client.</p>
              </div>
            )}
          </div>
        </div>

        {/* Invoices Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Integral CF, sans-serif' }}>
            Invoices
          </h3>
          <div className="space-y-3">
            {invoices.map(invoice => (
              <button
                key={invoice.id}
                onClick={() => navigate(`/invoices`)}
                className="w-full flex items-center justify-between p-5 glass-card bg-[#0d1117] hover:bg-[#161b22] border border-white/5 rounded-2xl transition-all group/inv"
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="text-sm font-bold text-white group-hover/inv:text-blue-400 transition-colors">
                    Invoice-{invoice.id.slice(0, 3)}
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    ${(invoice.amount || 0).toLocaleString()} • {formatAppDate(invoice.created_at)}
                  </span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/inv:text-white" />
              </button>
            ))}
            {invoices.length === 0 && (
              <div className="p-8 text-center glass-card bg-[#0d1117] border border-dashed border-white/10 rounded-3xl">
                <p className="text-gray-500 text-sm font-medium">No invoices.</p>
              </div>
            )}
          </div>
        </div>
      </div>

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
