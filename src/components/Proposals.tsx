import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
  User,
  Download,
  ArrowRight,
  Clock,
  CheckCircle,
  TrendingUp,
  XCircle,
} from 'lucide-react';
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
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
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

  const cleanTitle = (title: string) =>
    (title || '').replace(/^\s*(INV|PROP)-\d{3,}\s*[-:]?\s*/i, '').trim();

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

  const visibleProposals = proposals
    .filter((p: any) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'approved') return p.status === 'approved';
      if (statusFilter === 'pending') return p.status === 'sent' || p.status === 'viewed';
      return true;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date_asc': return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
        case 'amount_desc': return (Number(b.value) || 0) - (Number(a.value) || 0);
        case 'amount_asc': return (Number(a.value) || 0) - (Number(b.value) || 0);
        case 'date_desc':
        default: return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
      }
    });

  // Stats calculations
  const statsProposals = isAgency ? (proposals || []) : (visibleProposals || []);
  const awaitingCount = statsProposals.filter((p: any) => p.status === 'sent' || p.status === 'viewed').length;
  const approvedRevenue = statsProposals.filter((p: any) => p.status === 'approved').reduce((sum: number, p: any) => sum + (Number(p?.value) || 0), 0);
  const totalPipeline = statsProposals.reduce((sum: number, p: any) => sum + (Number(p?.value) || 0), 0);

  // Use the same date-based expiry check the cards use
  const isProposalExpired = (p: any) => {
    if (p.status === 'expired') return true;
    if (['approved', 'declined', 'draft'].includes(p.status)) return false;
    if (!p.expiryDate) return false;
    const expiry = new Date(p.expiryDate);
    if (isNaN(expiry.getTime())) return false;
    return expiry.getTime() < Date.now();
  };
  const expiredValue = statsProposals.filter((p: any) => isProposalExpired(p)).reduce((sum: number, p: any) => sum + (Number(p?.value) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8 mb-8 border border-white/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display font-bold gradient-text leading-tight tracking-tight uppercase mb-2" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)' }}>Proposals</h1>
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
      <div className="flex items-center gap-3">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-4 py-2.5 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm font-medium focus:border-[#3aa3eb] focus:ring-2 focus:ring-[#3aa3eb]/20 transition-all"
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Amount: High → Low</option>
          <option value="amount_asc">Amount: Low → High</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Awaiting Approval', value: awaitingCount, icon: Clock, filter: 'pending' as const, color: 'text-white', iconBg: 'bg-slate-700/50' },
          { label: 'Approved Revenue', value: `${(approvedRevenue / 100).toLocaleString()}`, icon: CheckCircle, filter: 'approved' as const, color: 'text-white', iconBg: 'bg-green-500/20' },
          { label: 'Total Pipeline Value', value: `${(totalPipeline / 100).toLocaleString()}`, icon: TrendingUp, filter: 'all' as const, color: 'text-white', iconBg: 'bg-blue-500/20', isActive: true },
          { label: 'Expired Value', value: `${(expiredValue / 100).toLocaleString()}`, icon: XCircle, filter: 'all' as const, color: 'text-white', iconBg: 'bg-red-500/20' },
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
                  <p className="text-2xl font-bold text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Proposals Cards — iOS Style */}
      <div className="pt-4">
        {visibleProposals.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center border border-white/10">
            <ClipboardList className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>No proposals found</h3>
            <p className="text-gray-500">
              {isAgency
                ? "You haven't created any proposals yet."
                : "You don't have any matching proposals at this time."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleProposals.map((proposal: any) => {
              const timelineStatus = getStatusTimeline(proposal);
              const isApproved = proposal.status === 'approved';
              const isExpired = proposal.status === 'expired' || timelineStatus.includes('Expired');
              const isPending = proposal.status === 'sent' || proposal.status === 'viewed';
              const isDraft = proposal.status === 'draft';

              const statusStyles: Record<string, { bg: string, border: string, text: string, dot: string }> = {
                approved: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', text: 'rgb(74, 222, 128)', dot: 'bg-green-500' },
                draft: { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)', text: 'rgb(250, 204, 21)', dot: 'bg-yellow-500' },
                sent: { bg: 'rgba(59, 163, 234, 0.15)', border: 'rgba(59, 163, 234, 0.4)', text: 'rgb(96, 165, 250)', dot: 'bg-[#3aa3eb]' },
                viewed: { bg: 'rgba(59, 163, 234, 0.15)', border: 'rgba(59, 163, 234, 0.4)', text: 'rgb(96, 165, 250)', dot: 'bg-[#3aa3eb]' },
                expired: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: 'rgb(248, 113, 113)', dot: 'bg-red-500' },
                default: { bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)', text: 'rgb(203, 213, 225)', dot: 'bg-slate-500' }
              };
              const style = statusStyles[proposal.status.toLowerCase()] || statusStyles.default;

              return (
                <div
                  key={proposal.id}
                  className="ios-card group relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden transition-all duration-300 hover:bg-white/[0.06] hover:border-white/15 hover:shadow-2xl hover:shadow-black/20"
                >
                  <div className="p-5 space-y-4">
                    {/* Top: Status pill + value */}
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                        style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                      <span className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>
                        ${((proposal.value || 0) / 100).toLocaleString()}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-base font-bold text-white leading-snug line-clamp-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>
                        {cleanTitle(proposal.title)}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">{proposal.client}</p>
                    </div>

                    {/* Service pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {proposal.services && proposal.services.length > 0 ? (
                        proposal.services.slice(0, 3).map((service: string, sIdx: number) => (
                          <span key={sIdx} className="px-2 py-0.5 bg-[#3aa3eb]/10 border border-[#3aa3eb]/30 rounded-full text-[10px] font-bold text-[#3aa3eb]">
                            {service}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 bg-[#3aa3eb]/10 border border-[#3aa3eb]/30 rounded-full text-[10px] font-bold text-[#3aa3eb]">
                          Website
                        </span>
                      )}
                      {proposal.services && proposal.services.length > 3 && (
                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-gray-400">
                          +{proposal.services.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Timeline pill */}
                    <div>
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
                        style={{
                          backgroundColor: isApproved ? 'rgba(34, 197, 94, 0.15)' : isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 163, 234, 0.15)',
                          borderColor: isApproved ? 'rgba(34, 197, 94, 0.4)' : isExpired ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 163, 234, 0.4)',
                          color: isApproved ? 'rgb(74, 222, 128)' : isExpired ? 'rgb(248, 113, 113)' : 'rgb(96, 165, 250)'
                        }}
                      >
                        {timelineStatus}
                      </span>
                    </div>

                    {/* Bottom: Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <button
                        onClick={() => handleViewProposal(proposal.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#3aa3eb] hover:text-white transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDownloadPDF(proposal)}
                          disabled={generatingPDFId === proposal.id}
                          className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                          title="Download PDF"
                        >
                          {generatingPDFId === proposal.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                        {isAgency && (
                          <>
                            <button
                              onClick={() => navigate(`/proposals/${proposal.id}`)}
                              className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProposal(proposal)}
                              className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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