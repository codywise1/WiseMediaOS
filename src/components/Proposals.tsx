import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { ArrowRight } from 'lucide-react';
import ProposalBuilderModal from './ProposalBuilderModal';
import ConfirmDialog from './ConfirmDialog';
import { clientService } from '../lib/supabase';
import { proposalService as newProposalService } from '../lib/proposalService';
import { formatAppDate } from '../lib/dateFormat';
import { useToast } from '../contexts/ToastContext';
import { UserRole } from '../lib/supabase';
import { generateProposalPDF } from '../utils/pdfGenerator';

interface User {
  id?: string;
  email: string;
  role: UserRole;
  name: string;
}

interface ProposalsProps {
  currentUser: User | null;
}

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

        console.log('Fetching proposals for client:', { email: currentUser.email, effectiveClientId });
        data = await newProposalService.getByClientId(effectiveClientId);

        // For clients, only show non-draft proposals
        if (Array.isArray(data)) {
          data = data.filter(p => p.status !== 'draft');
          console.log('Filtered proposals for client:', data.length);
        }
      } else if (currentUser?.id) {
        // Fallback to fetching by auth ID if no email
        data = await newProposalService.getByClientId(currentUser.id);
        if (Array.isArray(data)) {
          data = data.filter(p => p.status !== 'draft');
        }
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
        services: (proposal.items || []).map((item: any) => item.name),
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


  const [generatingPDFId, setGeneratingPDFId] = useState<string | null>(null);

  const handleDownloadPDF = async (proposal: any) => {
    try {
      setGeneratingPDFId(proposal.id);
      await new Promise(resolve => setTimeout(resolve, 800));
      await generateProposalPDF({
        ...proposal,
        services: proposal.services || []
      });
      toastSuccess('Proposal PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toastError('Failed to generate PDF');
    } finally {
      setGeneratingPDFId(null);
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

  const visibleProposals = proposals.filter((p: any) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'approved') return p.status === 'approved';
    if (statusFilter === 'pending') return p.status === 'sent' || p.status === 'viewed';
    return true;
  });

  // Stats calculations
  const statsProposals = isAgency ? (proposals || []) : (visibleProposals || []);
  const awaitingCount = statsProposals.filter((p: any) => p.status === 'sent' || p.status === 'viewed').length;
  const approvedRevenue = statsProposals.filter((p: any) => p.status === 'approved').reduce((sum: number, p: any) => sum + (Number(p?.value) || 0), 0);
  const totalPipeline = statsProposals.reduce((sum: number, p: any) => sum + (Number(p?.value) || 0), 0);
  const expiredValue = statsProposals.filter((p: any) => p.status === 'expired').reduce((sum: number, p: any) => sum + (Number(p?.value) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card neon-glow rounded-3xl p-8 lg:p-10 mb-8 border border-white/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold gradient-text mb-2 tracking-tighter" style={{ fontFamily: 'Integral CF, sans-serif' }}>Proposals</h1>
            <p className="text-gray-400 text-lg font-medium">
              {currentUser?.role === 'admin'
                ? 'Create, send, and manage structured project proposals.'
                : 'View project proposals, scopes, and approvals.'}
            </p>
          </div>
          {isAgency && (
            <button
              onClick={handleNewProposal}
              className="btn-header-glass space-x-2 shrink-0"
            >
              <span className="btn-text-glow">New Proposal</span>
              <ArrowRight className="h-4 w-4 ml-1" />
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
              className={`glass-card rounded-xl p-6 cursor-pointer transition-all duration-300 hover-glow group relative overflow-hidden border ${isFiltering || (isPipeline && statusFilter === 'all')
                ? 'border-[#3aa3eb] bg-[#3aa3eb]/10'
                : 'border-white/5 hover:border-white/10'
                }`}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3 rounded-lg ${card.iconBg} border border-white/10`}>
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

      {/* Proposals Table */}
      <div className="pt-4">
        <div className="glass-card rounded-3xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-300 uppercase tracking-widest">
                  <th className="px-8 py-5 text-[10px] font-black">Proposal Name</th>
                  <th className="px-6 py-5 text-[10px] font-black">Client</th>
                  <th className="px-6 py-5 text-[10px] font-black">Deal Stage</th>
                  <th className="px-6 py-5 text-[10px] font-black">Value</th>
                  <th className="px-6 py-5 text-[10px] font-black">Status Timeline</th>
                  <th className="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleProposals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center">
                      <ClipboardDocumentListIcon className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>No proposals found</h3>
                      <p className="text-gray-500">
                        {isAgency
                          ? "You haven't created any proposals yet."
                          : "You don't have any matching proposals at this time."}
                      </p>
                    </td>
                  </tr>
                ) : visibleProposals.map((proposal: any) => {
                  const timelineStatus = getStatusTimeline(proposal);
                  const isApproved = proposal.status === 'approved';
                  const isExpired = proposal.status === 'expired' || timelineStatus.includes('Expired');

                  return (
                    <tr key={proposal.id} className="group hover:bg-white/[0.03] transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-1 h-8 rounded-full ${isApproved ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                            isExpired ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                              'bg-[#3aa3eb] shadow-[0_0_10px_rgba(58,163,235,0.5)]'
                            }`} />
                          <div>
                            <h3 className="text-sm font-black text-white truncate max-w-[200px]" style={{ fontFamily: 'Integral CF, Montserrat, sans-serif' }}>
                              {proposal.title}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {proposal.services && proposal.services.length > 0 ? (
                                proposal.services.map((service: string, sIdx: number) => (
                                  <span key={sIdx} className="px-2 py-0.5 bg-[#3aa3eb]/10 border border-[#3aa3eb]/30 rounded-full text-[9px] font-bold text-[#3aa3eb]">
                                    {service}
                                  </span>
                                ))
                              ) : (
                                <span className="px-2 py-0.5 bg-[#3aa3eb]/10 border border-[#3aa3eb]/30 rounded-full text-[9px] font-bold text-[#3aa3eb]">
                                  Website
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-sm font-bold text-gray-200">{proposal.client}</span>
                      </td>
                      <td className="px-6 py-6">
                        {(() => {
                          const statusStyles: Record<string, { bg: string, border: string, text: string }> = {
                            approved: { bg: 'rgba(34, 197, 94, 0.33)', border: 'rgba(34, 197, 94, 1)', text: '#ffffff' },
                            draft: { bg: 'rgba(234, 179, 8, 0.33)', border: 'rgba(234, 179, 8, 1)', text: '#ffffff' },
                            sent: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff' },
                            viewed: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff' },
                            expired: { bg: 'rgba(239, 68, 68, 0.33)', border: 'rgba(239, 68, 68, 1)', text: '#ffffff' },
                            default: { bg: 'rgba(148, 163, 184, 0.33)', border: 'rgba(148, 163, 184, 1)', text: '#ffffff' }
                          };

                          const style = statusStyles[proposal.status.toLowerCase()] || statusStyles.default;

                          return (
                            <span
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all"
                              style={{
                                backgroundColor: style.bg,
                                border: `1px solid ${style.border}`,
                                color: style.text
                              }}
                            >
                              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-base font-black text-white" style={{ fontFamily: 'Integral CF, Montserrat, sans-serif' }}>
                          ${((proposal.value || 0) / 100).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-6 transition-all">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                          style={{
                            backgroundColor: isApproved ? 'rgba(34, 197, 94, 0.33)' : isExpired ? 'rgba(239, 68, 68, 0.33)' : 'rgba(59, 163, 234, 0.33)',
                            borderColor: isApproved ? 'rgba(34, 197, 94, 1)' : isExpired ? 'rgba(239, 68, 68, 1)' : 'rgba(59, 163, 234, 1)',
                            color: '#ffffff'
                          }}
                        >
                          {timelineStatus}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadPDF(proposal)}
                            disabled={generatingPDFId === proposal.id}
                            className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                            title="Download PDF"
                          >
                            {generatingPDFId === proposal.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                            ) : (
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleViewProposal(proposal.id)}
                            className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {isAgency && (
                            <>
                              <button
                                onClick={() => navigate(`/proposals/${proposal.id}`)}
                                className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProposal(proposal)}
                                className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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