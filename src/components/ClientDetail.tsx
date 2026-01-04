import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clientService, projectService, invoiceService, Client as ClientType, Project, isSupabaseAvailable, supabase, UserRole } from '../lib/supabase';
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
import Modal from './Modal';

const statusConfig: Record<ClientType['status'], { color: string; label: string }> = {
  prospect: { color: 'rgba(250,204,21,0.33) text-white border-#facc15', label: 'Prospect' },
  active: { color: 'rgba(34,197,94,0.33) text-white border-#22c55e', label: 'Active' },
  vip: { color: 'rgba(64,172,64,0.33) text-white border-#40ac40', label: 'VIP' },
  inactive: { color: 'rgba(234,59,59,0.3) text-white border-#ea3b3b', label: 'Inactive' },
  archived: { color: 'rgba(217,119,6,0.1) text-white border-#d97706', label: 'Archived' },
};

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
  role: UserRole;
  name: string;
}

interface ClientDetailProps {
  currentUser: User | null;
}

export default function ClientDetail({ currentUser }: ClientDetailProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientType | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientType | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [directMessage, setDirectMessage] = useState('');
  const [sendingDirectMessage, setSendingDirectMessage] = useState(false);

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

  const handleSendDirectMessage = async () => {
    const message = directMessage.trim();
    if (!message) return;

    try {
      setSendingDirectMessage(true);

      if (!isSupabaseAvailable()) {
        setDirectMessage('');
        setIsMessageModalOpen(false);
        alert('Demo mode: message sent.');
        return;
      }

      if (!profile?.id) {
        alert('Cannot send message: your profile is not available.');
        return;
      }

      const clientEmail = client?.email;
      if (!clientEmail) {
        alert('Cannot send message: client email is missing.');
        return;
      }

      const { data: recipientProfile } = await supabase!
        .from('profiles')
        .select('id')
        .eq('email', clientEmail)
        .maybeSingle();

      if (!recipientProfile?.id) {
        alert(`Cannot send message: ${client?.name || 'client'} hasn't created their account yet.`);
        return;
      }

      const { error } = await supabase!
        .from('private_messages')
        .insert({
          sender_id: profile.id,
          recipient_id: recipientProfile.id,
          message,
        });

      if (error) throw error;

      setDirectMessage('');
      setIsMessageModalOpen(false);
    } catch (error) {
      console.error('Error sending direct message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingDirectMessage(false);
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
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8 relative overflow-hidden group border border-white/10 shadow-2xl">
        <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {client.company || client.name}
              </h1>
              <div className="flex items-center gap-4 min-w-0">
                <p className="text-gray-300 text-sm font-medium">{client.name}</p>
                <div className="flex flex-wrap gap-3 shrink-0">
                  <CategoryBadge category={client.category || 'General'} />
                  {client.location && (
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white">
                      {client.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">

            <button
              onClick={() => setIsMessageModalOpen(true)}
              className="btn-pill shrink-glow-button flex items-center space-x-2"
              title="Message"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-200" />
              <span className="text-sm font-medium text-gray-200">Message</span>
            </button>
            <button
              onClick={() => {
                setSelectedClient(client);
                setIsEditModalOpen(true);
              }}
              className="btn-secondary shrink-glow-button p-2 rounded-lg transition-all group/btn"
            >
              <PencilIcon className="h-5 w-5 text-gray-400 group-hover/btn:text-white" />
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="btn-secondary shrink-glow-button p-2 rounded-lg transition-all group/btn"
              >
                <TrashIcon className="h-5 w-5 text-red-400/70 group-hover/btn:text-red-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="glass-card bg-[#0d1117] rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Contact Information
          </h3>
          <div className="space-y-4">
            <a href={`mailto:${client.email}`} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
              <div className="flex items-center gap-4">
                <div className="p-2 border border-white/10 rounded-xl">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <span className="text-gray-300 text-sm font-medium">{client.email}</span>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
            </a>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <span className="text-gray-300 text-sm font-medium">{formatPhoneNumber(client.phone)}</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}
          </div>
        </div>

        {/* Social Links */}
        <div className="glass-card bg-[#0d1117] rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Social Links
          </h3>
          <div className="space-y-4 max-h-[176px] overflow-y-auto pr-1 custom-scrollbar">
            {client.website && (
              <a href={buildWebsiteUrl(client.website)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <span className="text-gray-300 text-sm font-medium truncate max-w-[180px]">{displayWebsite(client.website)}</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}

            {client.linkedin && (
              <a href={buildLinkedInUrl(client.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0.5 8h4V24h-4V8zM8.5 8h3.8v2.2h.1c.5-1 1.9-2.2 4-2.2 4.3 0 5.1 2.8 5.1 6.5V24h-4v-8.2c0-2 0-4.5-2.7-4.5-2.7 0-3.1 2.1-3.1 4.3V24h-4V8z" /></svg>
                  </div>
                  <span className="text-gray-300 text-sm font-medium truncate max-w-[180px]">
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
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.39l-5.01-6.48L5.4 22H2.64l7.03-8.04L1.5 2H8l4.53 5.86L18.244 2zm-1.12 18h1.77L6.96 3.9H5.06L17.12 20z" /></svg>
                  </div>
                  <span className="text-gray-300 text-sm font-medium truncate max-w-[180px]">
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
                  <span className="text-gray-300 text-sm font-medium truncate max-w-[180px]">
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
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24H12.82v-9.294H9.692V11.01h3.128V8.309c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.59l-.467 3.696h-3.123V24h6.126C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" /></svg>
                  </div>
                  <span className="text-gray-300 text-sm font-medium truncate max-w-[180px]">
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
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.9v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.31 0 .61.05.9.14V9.02a6.71 6.71 0 0 0-.9-.06A6.71 6.71 0 0 0 2.33 15.7a6.71 6.71 0 0 0 6.71 6.71 6.71 6.71 0 0 0 6.71-6.71V9.4a8.74 8.74 0 0 0 3.84 1.01V6.69z" /></svg>
                  </div>
                  <span className="text-gray-300 text-sm font-medium truncate max-w-[180px]">
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

            {client.youtube && (
              <a href={buildYouTubeUrl(client.youtube)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                  </div>
                  <span className="text-gray-300 text-sm font-medium truncate max-w-[180px]">
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
          <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Details
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400 text-sm font-medium">Client State</span>
              {(() => {
                const statusInfo = statusConfig[client.status as keyof typeof statusConfig];
                if (!statusInfo) return <span className="text-white text-sm font-semibold uppercase tracking-wider">{client.status}</span>;
                return (
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
                );
              })()}
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400 text-sm font-medium">Added</span>
              <span className="text-white text-sm font-semibold">{formatAppDate(client.created_at)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400 text-sm font-medium">Projects Completed</span>
              <span className="text-white text-sm font-semibold">{projects.filter(p => p.status === 'completed').length}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400 text-sm font-medium">Lifetime Value</span>
              <span className="text-white text-sm font-semibold tabular-nums">
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
            <h3 className="text-lg font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
                    <h4 className="text-white font-black text-base leading-tight min-w-0" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {project.name}
                    </h4>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(59, 163, 234, 0.33)', border: '1px solid rgba(59, 163, 234, 1)', color: '#ffffff' }}>
                      {project.project_type || 'Website'}
                    </span>
                  </div>
                  <span className="text-white font-bold text-sm tabular-nums" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    ${(project.budget || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <span className="text-xs text-gray-500 font-bold tracking-wider">
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
          <h3 className="text-lg font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
                  <span className="text-base font-bold text-white group-hover/inv:text-blue-400 transition-colors">
                    Invoice-{invoice.id.slice(0, 3)}
                  </span>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
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

      <Modal
        isOpen={isMessageModalOpen}
        onClose={() => {
          if (sendingDirectMessage) return;
          setIsMessageModalOpen(false);
        }}
        title={`Message ${client?.name || 'Client'}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <textarea
            value={directMessage}
            onChange={(e) => setDirectMessage(e.target.value)}
            rows={5}
            className="form-input w-full px-4 py-3 rounded-lg text-sm"
            placeholder="Write a direct message..."
            disabled={sendingDirectMessage}
          />
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setIsMessageModalOpen(false)}
              className="btn-secondary shrink-glow-button"
              disabled={sendingDirectMessage}
            >
              Cancel
            </button>
            <button
              onClick={handleSendDirectMessage}
              className="btn-primary shrink-glow-button disabled:opacity-60"
              disabled={sendingDirectMessage || !directMessage.trim()}
            >
              {sendingDirectMessage ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
