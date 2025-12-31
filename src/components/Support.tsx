import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { clientService, supportService, UserRole } from '../lib/supabase';
import { 
  ChatBubbleLeftRightIcon, 
  TicketIcon,
  QuestionMarkCircleIcon,
  BookOpenIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import SupportModal from './SupportModal';
import ConfirmDialog from './ConfirmDialog';

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface SupportProps {
  currentUser: User | null;
}

const initialSupportTickets: any[] = [];

const knowledgeBase = [
  {
    id: 1,
    title: 'How to update your website content',
    category: 'Content Management',
    views: 1250,
    helpful: 98,
  },
  {
    id: 2,
    title: 'Setting up email campaigns',
    category: 'Marketing',
    views: 890,
    helpful: 95,
  },
  {
    id: 3,
    title: 'Troubleshooting payment issues',
    category: 'Billing',
    views: 756,
    helpful: 92,
  },
  {
    id: 4,
    title: 'SEO best practices guide',
    category: 'SEO',
    views: 2100,
    helpful: 99,
  },
];

const statusConfig = {
  open: { color: 'bg-[#3aa3eb]/30 text-[#3aa3eb]', icon: ClockIcon, label: 'Open' },
  in_progress: { color: 'bg-[#3aa3eb]/30 text-[#3aa3eb]', icon: ClockIcon, label: 'In Progress' },
  resolved: { color: 'bg-white/30 text-white', icon: CheckCircleIcon, label: 'Resolved' },
  closed: { color: 'bg-gray-900/30 text-gray-400', icon: CheckCircleIcon, label: 'Closed' },
};

const priorityConfig = {
  low: 'bg-gray-900/30 text-gray-400',
  medium: 'bg-[#3aa3eb]/30 text-[#3aa3eb]',
  high: 'bg-[#3aa3eb]/30 text-[#3aa3eb]',
  urgent: 'bg-red-900/30 text-red-400',
};

export default function Support({ currentUser }: SupportProps) {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();
  const [supportTickets, setSupportTickets] = useState(initialSupportTickets);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<typeof initialSupportTickets[0] | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  React.useEffect(() => {
    loadSupportTickets();
  }, [currentUser?.id, currentUser?.role]);

  const loadSupportTickets = async () => {
    try {
      if (supportTickets.length === 0) {
        setLoading(true);
      }
      let data: any[] = [];
      
      if (currentUser?.role === 'admin') {
        data = await supportService.getAll();
      } else if (currentUser?.id) {
        // Resolve clients.id by email (schema uses support_tickets.client_id -> clients.id)
        // Fallback to auth user id for legacy schemas using profiles.id
        const clientRecord = await clientService.getByEmail(currentUser.email).catch(() => null);
        const effectiveClientId = clientRecord?.id || currentUser.id;
        data = await supportService.getByClientId(effectiveClientId);
      }
      
      // Transform data to match component interface
      const transformedTickets = data.map(ticket => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        created: ticket.created_at?.split('T')[0] || '',
        lastUpdate: ticket.updated_at?.split('T')[0] || '',
        description: ticket.description,
        category: ticket.category
      }));
      
      setSupportTickets(transformedTickets);
    } catch (error) {
      console.error('Error loading support tickets:', error);
      if (supportTickets.length === 0) {
        setSupportTickets([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const openTickets = supportTickets.filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress').length;
  const resolvedTickets = supportTickets.filter(ticket => ticket.status === 'resolved').length;

  const handleNewTicket = () => {
    setSelectedTicket(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditTicket = (ticket: typeof initialSupportTickets[0]) => {
    setSelectedTicket(ticket);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteTicket = (ticket: typeof initialSupportTickets[0]) => {
    setSelectedTicket(ticket);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveTicket = (ticketData: any) => {
    const saveTicket = async () => {
      try {
        // Transform data for API
        const apiData = {
          id: modalMode === 'create' ? `TICK-2024-${String(supportTickets.length + 1).padStart(3, '0')}` : ticketData.id,
          client_id: currentUser?.id || '',
          subject: ticketData.subject,
          description: ticketData.description,
          status: ticketData.status,
          priority: ticketData.priority,
          category: ticketData.category
        };

        if (modalMode === 'create') {
          await supportService.create(apiData);
        } else if (selectedTicket) {
          await supportService.update(selectedTicket.id, apiData);
        }
        
        // Reload tickets
        await loadSupportTickets();
      } catch (error) {
        console.error('Error saving support ticket:', error);
        toastError('Error saving support ticket. Please try again.');
      }
    };
    
    saveTicket();
  };

  const confirmDelete = async () => {
    if (selectedTicket) {
      try {
        await supportService.delete(selectedTicket.id);
        await loadSupportTickets();
        setIsDeleteDialogOpen(false);
        setSelectedTicket(undefined);
        toastSuccess('Support ticket deleted successfully.');
      } catch (error) {
        console.error('Error deleting support ticket:', error);
        toastError('Error deleting support ticket. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Support Center</h1>
            <p className="text-gray-300">Get help, submit tickets, and access resources</p>
          </div>
          <button 
            onClick={handleNewTicket}
            className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center justify-center space-x-2 shrink-glow-button shrink-0 w-full sm:w-auto"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Ticket</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl p-6 card-hover cursor-pointer">
          <div className="p-3 rounded-lg bg-[#3aa3eb] mb-4 inline-block">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Live Chat</h3>
          <p className="text-gray-400 text-sm mb-4">Get instant help from our team</p>
          <button 
            onClick={() => console.log('Starting live chat')}
            className="btn-secondary w-full py-2 rounded-lg text-sm font-medium shrink-glow-button"
          >
            Start Chat
          </button>
        </div>

        <div className="glass-card rounded-xl p-6 card-hover cursor-pointer">
          <div className="p-3 rounded-lg bg-[#3aa3eb] mb-4 inline-block">
            <TicketIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Submit Ticket</h3>
          <p className="text-gray-400 text-sm mb-4">Create a detailed support request</p>
          <button 
            onClick={handleNewTicket}
            className="btn-secondary w-full py-2 rounded-lg text-sm font-medium shrink-glow-button"
          >
            New Ticket
          </button>
        </div>

        <div className="glass-card rounded-xl p-6 card-hover cursor-pointer">
          <div className="p-3 rounded-lg bg-[#3aa3eb] mb-4 inline-block">
            <BookOpenIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Knowledge Base</h3>
          <p className="text-gray-400 text-sm mb-4">Find answers to common questions</p>
          <a
            href="https://wisemedia.io/blogs/"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary w-full py-2 rounded-lg text-sm font-medium shrink-glow-button flex items-center justify-center text-center"
          >
            Browse Articles
          </a>
        </div>

        <div className="glass-card rounded-xl p-6 card-hover cursor-pointer">
          <div className="p-3 rounded-lg bg-[#3aa3eb] mb-4 inline-block">
            <PhoneIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Schedule Call</h3>
          <p className="text-gray-400 text-sm mb-4">Book a consultation with our team</p>
          <button 
            onClick={() => navigate('/appointments')}
            className="btn-secondary w-full py-2 rounded-lg text-sm font-medium shrink-glow-button"
          >
            Book Call
          </button>
        </div>
      </div>

      {/* Support Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-400">Open Tickets</p>
              <p className="text-2xl font-bold text-white">{openTickets}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-400">Resolved This Month</p>
              <p className="text-2xl font-bold text-white">{resolvedTickets}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <QuestionMarkCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-400">Avg Response Time</p>
              <p className="text-2xl font-bold text-white">2.5 hours</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="glass-card rounded-xl neon-glow">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Your Support Tickets</h2>
        </div>
        
        <div className="divide-y divide-slate-700">
          {supportTickets.map((ticket) => {
            const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];
            const StatusIcon = statusInfo.icon;

            return (
              <div key={ticket.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-700">
                      <TicketIcon className="h-6 w-6 text-gray-300" />
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-center sm:gap-3">
                        <h3 className="text-lg font-bold text-white min-w-0 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{ticket.subject}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${priorityConfig[ticket.priority as keyof typeof priorityConfig]}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1 truncate">{ticket.category} • {ticket.id}</p>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{ticket.description}</p>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button 
                          onClick={() => handleEditTicket(ticket)}
                          className="text-blue-500 hover:text-white p-1 shrink-glow-button"
                          title="Edit Ticket"
                          aria-label="Edit Ticket"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTicket(ticket)}
                          className="text-blue-500 hover:text-red-400 p-1 shrink-glow-button"
                          title="Delete Ticket"
                          aria-label="Delete Ticket"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <p className="text-sm text-gray-400">Created: {ticket.created}</p>
                    <p className="text-sm text-gray-400">Updated: {ticket.lastUpdate}</p>
                  </div>
                  
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        toastInfo(`Ticket Details:\n\nID: ${ticket.id}\nSubject: ${ticket.subject}\nStatus: ${ticket.status}\nPriority: ${ticket.priority}\nCategory: ${ticket.category}\n\nDescription: ${ticket.description}`, 10000);
                      }}
                      className="text-white hover:text-blue-300 text-sm shrink-glow-button w-full sm:w-auto"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => {
                        const comment = prompt('Add a comment to this ticket:');
                        if (comment) {
                          toastSuccess(`Comment added to ticket ${ticket.id}:\n\n"${comment}"\n\nOur team will respond shortly.`);
                        }
                      }}
                      className="text-white hover:text-blue-300 text-sm shrink-glow-button w-full sm:w-auto"
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Knowledge Base */}
      <div className="glass-card rounded-xl neon-glow">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Popular Articles</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeBase.map((article) => (
              <div 
                key={article.id} 
                onClick={() => console.log(`Viewing article ${article.id}`)}
                className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-medium">{article.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{article.category}</p>
                  </div>
                  <BookOpenIcon className="h-5 w-5 text-[#3aa3eb]" />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">{article.views} views</span>
                  <span className="text-xs text-green-400">{article.helpful}% helpful</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#3aa3eb]">
              <EnvelopeIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">Email Support</p>
              <p className="text-gray-400">info@wisemedia.io</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#3aa3eb]">
              <PhoneIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">Phone Support</p>
              <p className="text-gray-400">+1 (587) 718-0698</p>
            </div>
          </div>
        </div>
      </div>

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTicket}
        ticket={selectedTicket}
        mode={modalMode}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Support Ticket"
        message={`Are you sure you want to delete ticket "${selectedTicket?.subject}"? This action cannot be undone.`}
      />
    </div>
  );
}
