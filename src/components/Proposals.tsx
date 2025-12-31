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
  TrashIcon
} from '@heroicons/react/24/outline';
import ProposalBuilderModal from './ProposalBuilderModal';
import ConfirmDialog from './ConfirmDialog';
import { proposalService as newProposalService } from '../lib/proposalService';
import { formatAppDate } from '../lib/dateFormat';
import { useToast } from '../contexts/ToastContext';

interface User {
  id?: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface ProposalsProps {
  currentUser: User | null;
}

const statusConfig = {
  draft: { color: 'bg-gray-900/30 text-gray-400', icon: PencilIcon, label: 'Draft' },
  sent: { color: 'bg-[#3aa3eb]/30 text-[#3aa3eb]', icon: ClockIcon, label: 'Sent' },
  viewed: { color: 'bg-[#3aa3eb]/30 text-[#3aa3eb]', icon: EyeIcon, label: 'Viewed' },
  approved: { color: 'bg-green-500/30 text-green-400', icon: CheckCircleIcon, label: 'Approved' },
  declined: { color: 'bg-red-900/30 text-red-400', icon: ClipboardDocumentListIcon, label: 'Declined' },
  expired: { color: 'bg-orange-900/30 text-orange-400', icon: CalendarIcon, label: 'Expired' },
  archived: { color: 'bg-gray-700/30 text-gray-500', icon: ClipboardDocumentListIcon, label: 'Archived' },
};

export default function Proposals({ currentUser }: ProposalsProps) {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      
      const data = await newProposalService.getAll();
      
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

  const totalValue = proposals.reduce((sum, proposal) => sum + (proposal.value || 0), 0);
  const approvedValue = proposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.value || 0), 0);
  const pendingCount = proposals.filter(p => p.status === 'sent' || p.status === 'viewed').length;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  // Users can only see sent/approved proposals, admins see all
  const visibleProposals = isAdmin ? proposals : proposals.filter(p => p.status === 'sent' || p.status === 'viewed' || p.status === 'approved');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Proposals</h1>
            <p className="text-gray-300">Create, track, and manage project proposals</p>
          </div>
          {isAdmin && (
            <button 
              onClick={handleNewProposal}
              className="btn-primary text-white font-medium flex items-center justify-center space-x-2 shrink-glow-button shrink-0 w-full sm:w-auto"
            >
              <PlusIcon className="h-5 w-5" />
              New Proposal
            </button>
          )}
          {!isAdmin && (
            <div className="text-sm text-gray-400">Review and manage your proposals</div>
          )}
        </div>
      </div>

      {/* Proposal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Total Proposals</p>
              <p className="text-2xl font-bold text-white">{visibleProposals.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Approved Value</p>
              <p className="text-2xl font-bold text-white">${(approvedValue / 100).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Pending Review</p>
              <p className="text-2xl font-bold text-white">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Total Value</p>
              <p className="text-2xl font-bold text-white">${(totalValue / 100).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-6">
        {visibleProposals.map((proposal) => {
          console.log('Proposal status:', proposal.status, 'Type:', typeof proposal.status);
          const statusInfo = statusConfig[proposal.status as keyof typeof statusConfig] || statusConfig.draft;
          const StatusIcon = statusInfo.icon;
          
          return (
            <div key={proposal.id} className="glass-card rounded-xl p-6 card-hover neon-glow">
              <div className="flex flex-col gap-4 mb-4 min-w-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="p-3 rounded-lg bg-slate-700">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-gray-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-center sm:gap-3">
                      <h3 className="text-lg font-bold text-white min-w-0 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{proposal.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusInfo.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 truncate">{proposal.client}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{proposal.description}</p>
                  </div>
                </div>
                
                <div className="text-left sm:text-right">
                  {isAdmin && (
                    <div className="flex items-center justify-start sm:justify-end space-x-2 mb-2">
                      <button 
                        onClick={() => handleViewProposal(proposal.id)}
                        className="text-blue-500 hover:text-white p-1 shrink-glow-button"
                        title="View Proposal"
                      >
                        <EyeIcon className="h-4 w-4 text-blue-500" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProposal(proposal)}
                        className="text-blue-500 hover:text-red-400 p-1 shrink-glow-button"
                        title="Delete Proposal"
                      >
                        <TrashIcon className="h-4 w-4 text-blue-500" />
                      </button>
                    </div>
                  )}
                  <p className="text-2xl font-bold text-white">${((proposal.value || 0) / 100).toLocaleString()}</p>
                </div>
              </div>

              {/* Linked Invoice Info */}
              {proposal.invoice && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-blue-300 font-semibold">Linked Invoice:</span>
                      <span className="text-sm text-gray-300">
                        {proposal.invoice.status === 'draft' ? 'Draft (activates on approval)' : 
                         proposal.invoice.status === 'unpaid' ? 'Active - Unpaid' :
                         proposal.invoice.status === 'paid' ? 'Paid' : 'Voided'}
                      </span>
                    </div>
                    {proposal.invoice.status !== 'draft' && (
                      <button
                        onClick={() => navigate(`/invoices/${proposal.invoice.id}`)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        View Invoice →
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Created: {proposal.createdDate ? formatAppDate(proposal.createdDate) : '—'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Expires: {proposal.expiryDate ? formatAppDate(proposal.expiryDate) : '—'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end flex-wrap">
                    {proposal.status === 'sent' && isAdmin && (
                      <>
                        <button
                          onClick={() => handleApprove(proposal.id)}
                          className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecline(proposal.id)}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {proposal.status === 'approved' && (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Approved {proposal.approved_at ? formatAppDate(proposal.approved_at) : ''}</span>
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/proposals/${proposal.id}`)}
                      className="px-4 py-2 bg-[#3aa3eb] text-white text-sm font-medium rounded-lg hover:bg-[#2d8bc7] transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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