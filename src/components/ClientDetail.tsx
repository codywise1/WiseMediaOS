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
                <span className="text-gray-300 font-medium truncate max-w-[180px]">{client.email}</span>
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
          <div className="space-y-4">
            {client.instagram && (
              <a href={`https://instagram.com/${client.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                  </div>
                  <span className="text-gray-300 font-medium">@{client.instagram}</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-600 group-hover/item:text-white" />
              </a>
            )}
            {client.youtube && (
              <a href={`https://youtube.com/${client.youtube}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className="p-2 border border-white/10 rounded-xl">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <span className="text-gray-300 font-medium truncate max-w-[180px]">{client.company || client.name} Studio</span>
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
