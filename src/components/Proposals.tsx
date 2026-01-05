import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import ProposalBuilderModal from './ProposalBuilderModal';
import ConfirmDialog from './ConfirmDialog';
import { clientService } from '../lib/supabase';
import { proposalService as newProposalService } from '../lib/proposalService';
import { formatAppDate } from '../lib/dateFormat';
import { useToast } from '../contexts/ToastContext';
import { UserRole } from '../lib/supabase';

interface User {
  id?: string;
  email: string;
  role: UserRole;
  name: string;
}

interface ProposalsProps {
  currentUser: User | null;
}

const statusConfig = {
  draft: { color: 'text-gray-400', border: 'border-gray-500/50', label: 'Draft' },
  sent: { color: 'text-blue-400', border: 'border-blue-500/50', label: 'Sent' },
  viewed: { color: 'text-blue-400', border: 'border-blue-500/50', label: 'Viewed' },
  approved: { color: 'text-green-400', border: 'border-green-500/50', label: 'Approved' },
  declined: { color: 'text-red-400', border: 'border-red-500/50', label: 'Declined' },
  expired: { color: 'text-red-400', border: 'border-red-500/50', label: 'Expired' },
  archived: { color: 'text-gray-500', border: 'border-gray-500/30', label: 'Archived' },
};

export default function Proposals({ currentUser }: ProposalsProps) {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any | undefined>();

  React.useEffect(() => {
    loadProposals();
  }, [currentUser?.id, currentUser?.role]);

  const loadProposals = async () => {
    try {
      if (proposals.length === 0) {
        setLoading(true);
      }

      let data: any[] = [];
      const userRole = (currentUser?.role || '').toLowerCase();
      const isAgency = userRole === 'admin' || userRole === 'staff';

      if (isAgency) {
        data = await newProposalService.getAll();
      } else if (currentUser?.email) {
        // Resolve client_id from email for clients
        const clientRecord = await clientService.getByEmail(currentUser.email).catch(() => null);
        const effectiveClientId = clientRecord?.id || currentUser.id || '';
        data = await newProposalService.getByClientId(effectiveClientId);
      } else {
        data = [];
      }

      console.log('Raw proposals data:', data);

      if (!Array.isArray(data)) {
        console.error('Proposals data is not an array:', data);
        setProposals([]);
        return;
      }

      // Transform data to match component interface
      const transformedProposals = data.map(proposal => ({
        id: proposal.id,
        title: proposal.title,
        client: proposal.client?.company || proposal.client?.name || 'Unknown Client',
        client_id: proposal.client_id,
        value: proposal.value,
        status: proposal.status,
        services: [],
        description: proposal.description || '',
        createdDate: proposal.created_at || '',
        expiryDate: proposal.expires_at || '',
        sent_at: proposal.sent_at,
        approved_at: proposal.approved_at,
        invoice: proposal.invoice
      }));

      setProposals(transformedProposals);
    } catch (error) {
      console.error('Error loading proposals:', error);
      if (proposals.length === 0) {
        setProposals([]);
      }
      toastError('Error loading proposals. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleNewProposal = () => {
    setIsModalOpen(true);
  };

  const handleViewProposal = (proposalId: string) => {
    navigate(`/proposals/${proposalId}`);
  };

  const handleDeleteProposal = (proposal: any) => {
    setSelectedProposal(proposal);
    setIsDeleteDialogOpen(true);
  };

  const handleProposalSuccess = async () => {
    await loadProposals();
    toastSuccess('Proposal created successfully!');
  };

  const confirmDelete = () => {
    const deleteProposal = async () => {
      if (selectedProposal) {
        try {
          await newProposalService.delete(selectedProposal.id);
          await loadProposals();
          setIsDeleteDialogOpen(false);
          setSelectedProposal(undefined);
          toastSuccess('Proposal deleted successfully.');
        } catch (error) {
          console.error('Error deleting proposal:', error);
          toastError('Error deleting proposal. Please try again.');
        }
      }
    };

    deleteProposal();
  };

  const handleApprove = async (proposalId: string) => {
    try {
      await newProposalService.approve(proposalId, currentUser?.id);
      await loadProposals();
      toastSuccess('Proposal approved! Invoice has been activated.');
    } catch (error) {
      console.error('Error approving proposal:', error);
      toastError('Error approving proposal. Please try again.');
    }
  };

  const handleDecline = async (proposalId: string) => {
    try {
      await newProposalService.decline(proposalId, currentUser?.id);
      await loadProposals();
      toastSuccess('Proposal declined. Invoice has been voided.');
    } catch (error) {
      console.error('Error declining proposal:', error);
      toastError('Error declining proposal. Please try again.');
    }
  };

  const getStatusTimeline = (proposal: any) => {
    if (proposal.status === 'approved' && proposal.approved_at) {
      return `Signed on ${formatAppDate(proposal.approved_at)}`;
    }

    if (proposal.expiryDate) {
      const expiry = new Date(proposal.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);

      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return `Expired ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'Day' : 'Days'} Ago`;
      } else {
        return `Expires in ${diffDays} ${diffDays === 1 ? 'Day' : 'Days'}`;
      }
    }

    return `Created ${formatAppDate(proposal.createdDate)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isStaff = userRole === 'staff';
  const isAgency = isAdmin || isStaff;
  const currentUserId = currentUser?.id;

  console.log('Render Proposals - User:', { id: currentUserId, role: userRole, isAgency });

  const visibleProposals = proposals.filter(p => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'approved') return p.status === 'approved';
    if (statusFilter === 'pending') return p.status === 'sent' || p.status === 'viewed';
    return true;
  });

  // Stats calculations
  const statsProposals = isAgency ? (proposals || []) : (visibleProposals || []);
  const awaitingCount = statsProposals.filter(p => p.status === 'sent' || p.status === 'viewed').length;
  const approvedRevenue = statsProposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + (Number(p?.value) || 0), 0);
  const totalPipeline = statsProposals.reduce((sum, p) => sum + (Number(p?.value) || 0), 0);
  const expiredValue = statsProposals.filter(p => p.status === 'expired').reduce((sum, p) => sum + (Number(p?.value) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card neon-glow rounded-3xl p-8 lg:p-10 mb-8 border border-white/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold gradient-text mb-2 tracking-tighter" style={{ fontFamily: 'Integral CF, sans-serif' }}>PROPOSALS</h1>
            <p className="text-gray-400 text-lg font-medium">Create, track, and manage project proposals</p>
          </div>
          {isAgency && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary text-white font-medium flex items-center space-x-2 shrink-glow-button shrink-0"
            >
              <PlusIcon className="h-5 w-5" />
              <span>New Proposal</span>
            </button>
          )}
        </div>
      </div>

      {/* Proposal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Awaiting Approval', value: awaitingCount, icon: UserIcon, filter: 'pending' as const, color: 'text-white', iconBg: 'bg-slate-700/50' },
          { label: 'Approved Revenue', value: `$${(approvedRevenue / 100).toLocaleString()}`, icon: UserIcon, filter: 'approved' as const, color: 'text-white', iconBg: 'bg-green-500/20' },
          { label: 'Total Pipeline Value', value: `$${(totalPipeline / 100).toLocaleString()}`, icon: UserIcon, filter: 'all' as const, color: 'text-white', iconBg: 'bg-blue-500/20', isActive: true },
          { label: 'Expired Value', value: `$${(expiredValue / 100).toLocaleString()}`, icon: UserIcon, filter: 'all' as const, color: 'text-white', iconBg: 'bg-red-500/20' },
        ].map((card, index) => {
          const isFiltering = statusFilter === card.filter;
          const isPipeline = card.label === 'Total Pipeline Value';
          return (
            <div
              key={index}
              onClick={() => setStatusFilter(card.filter)}
              className={`glass-card rounded-2xl p-6 cursor-pointer transition-all duration-300 hover-glow group relative overflow-hidden border ${isFiltering || (isPipeline && statusFilter === 'all')
                ? 'border-[#3aa3eb] bg-[#3aa3eb]/10'
                : 'border-white/5 hover:border-white/10'
                }`}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3 rounded-xl ${card.iconBg} border border-white/10`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Proposals List (Table-like Header) */}
      <div className="pt-8">
        <div className="px-8 mb-4 grid grid-cols-12 gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 border-b border-white/5 pb-2">
          <div className="col-span-3">Proposal Name</div>
          <div className="col-span-2">Client</div>
          <div className="col-span-2 text-center">Deal Stage</div>
          <div className="col-span-1 text-center">Value</div>
          <div className="col-span-3 text-center">Status Timeline</div>
          <div className="col-span-1 text-right"></div>
        </div>

        <div className="space-y-3">
          {visibleProposals.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-white/5">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>No proposals found</h3>
              <p className="text-gray-500">
                {isAgency
                  ? "You haven't created any proposals yet."
                  : "You don't have any matching proposals at this time."}
              </p>
            </div>
          ) : visibleProposals.map((proposal) => {
            const statusInfo = statusConfig[proposal.status as keyof typeof statusConfig] || statusConfig.draft;
            const timelineStatus = getStatusTimeline(proposal);
            const isApproved = proposal.status === 'approved';
            const isExpired = proposal.status === 'expired' || timelineStatus.includes('Expired');

            return (
              <div key={proposal.id} className="glass-card rounded-2xl p-6 transition-all duration-300 hover:border-[#3aa3eb]/50 hover:shadow-[0_0_20px_rgba(58,163,235,0.1)] group relative border border-white/5 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Proposal Name */}
                  <div className="col-span-3 min-w-0">
                    <h3 className="text-xl font-bold text-white truncate mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>{proposal.title}</h3>
                    <div className="flex flex-wrap gap-2 text-Montserrat">
                      <span className="px-3 py-1 bg-[#3aa3eb]/10 border border-[#3aa3eb]/30 rounded-full text-[10px] font-bold text-[#3aa3eb] uppercase tracking-wider">
                        Website
                      </span>
                      {proposal.services && proposal.services.length > 1 && (
                        <span className="px-3 py-1 bg-[#3aa3eb]/10 border border-[#3aa3eb]/30 rounded-full text-[10px] font-bold text-[#3aa3eb] uppercase tracking-wider">
                          Web App
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Client */}
                  <div className="col-span-2 text-gray-300 font-bold">
                    {proposal.client}
                  </div>

                  {/* Deal Stage */}
                  <div className="col-span-2 flex justify-center">
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusInfo.border} ${statusInfo.color} bg-black/20`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Value */}
                  <div className="col-span-1 text-center text-white font-bold">
                    ${((proposal.value || 0) / 100).toLocaleString()}
                  </div>

                  {/* Status Timeline */}
                  <div className="col-span-3 flex justify-center">
                    <span className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-tight border ${isApproved ? 'bg-green-500/10 border-green-500/50 text-green-400' :
                      isExpired ? 'bg-red-500/10 border-red-500/50 text-red-400' :
                        'bg-[#3aa3eb]/10 border-[#3aa3eb]/50 text-blue-400'
                      }`}>
                      {timelineStatus}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-3">
                    <button onClick={() => handleViewProposal(proposal.id)} className="text-gray-400 hover:text-white transition-colors">
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    {isAgency && (
                      <>
                        <button onClick={() => navigate(`/proposals/${proposal.id}`)} className="text-gray-400 hover:text-white transition-colors">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDeleteProposal(proposal)} className="text-gray-400 hover:text-red-400 transition-colors">
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
      </div>

      <ProposalBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProposalSuccess}
        currentUserId={currentUser?.id}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Proposal"
        message={`Are you sure you want to delete proposal "${selectedProposal?.title}"? This action cannot be undone.`}
      />
    </div>
  );
}