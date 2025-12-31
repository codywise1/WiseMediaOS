import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CalendarIcon,
  EyeIcon,
  XCircleIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { proposalService, ProposalItem } from '../lib/proposalService';
import { serviceTemplates } from '../config/serviceTemplates';
import { formatAppDate } from '../lib/dateFormat';
import { useToast } from '../contexts/ToastContext';

interface User {
  id?: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface ProposalDetailProps {
  currentUser: User | null;
}

const statusIcons = {
  draft: { icon: DocumentTextIcon, color: 'text-gray-400', bg: 'bg-gray-900/30' },
  sent: { icon: ClockIcon, color: 'text-blue-400', bg: 'bg-blue-500/30' },
  viewed: { icon: EyeIcon, color: 'text-blue-400', bg: 'bg-blue-500/30' },
  approved: { icon: CheckCircleIcon, color: 'text-green-400', bg: 'bg-green-500/30' },
  declined: { icon: XCircleIcon, color: 'text-red-400', bg: 'bg-red-500/30' },
  expired: { icon: CalendarIcon, color: 'text-orange-400', bg: 'bg-orange-500/30' },
  archived: { icon: ArchiveBoxIcon, color: 'text-gray-500', bg: 'bg-gray-700/30' }
};

export default function ProposalDetail({ currentUser }: ProposalDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [proposal, setProposal] = useState<any>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sow' | 'pricing' | 'activity' | 'timeline'>('overview');

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ClipboardDocumentListIcon },
    { id: 'pricing', name: 'Pricing & Billing', icon: BanknotesIcon },
    { id: 'sow', name: 'Scope of Work', icon: DocumentTextIcon },
    { id: 'timeline', name: 'Timeline', icon: CalendarIcon },
    { id: 'activity', name: 'Activity Log', icon: ChatBubbleLeftRightIcon },
  ];

  useEffect(() => {
    if (id) {
      loadProposal();
    }
  }, [id]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      const data = await proposalService.getById(id!);
      setProposal(data);

      const itemsData = await proposalService.getItems(id!);
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading proposal:', error);
      toastError('Failed to load proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      await proposalService.approve(id, currentUser?.id);
      toastSuccess('Proposal approved! Invoice has been activated.');
      await loadProposal();
    } catch (error) {
      console.error('Error approving proposal:', error);
      toastError('Failed to approve proposal');
    }
  };

  const handleDecline = async () => {
    if (!id) return;
    try {
      await proposalService.decline(id, currentUser?.id);
      toastSuccess('Proposal declined. Invoice has been voided.');
      await loadProposal();
    } catch (error) {
      console.error('Error declining proposal:', error);
      toastError('Failed to decline proposal');
    }
  };

  const handleRevise = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to revise this proposal? This will revert both the proposal and its linked invoice to Draft status, allowing you to make changes.')) {
      return;
    }

    try {
      await proposalService.revise(id, currentUser?.id);
      toastSuccess('Proposal reverted to draft. You can now edit services and pricing.');
      await loadProposal();
      setActiveTab('pricing'); // Move to pricing tab so they can start editing
    } catch (error) {
      console.error('Error revising proposal:', error);
      toastError('Failed to revise proposal');
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: proposal?.currency || 'CAD'
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Proposal Not Found</h2>
          <button
            onClick={() => navigate('/proposals')}
            className="btn-primary"
          >
            Back to Proposals
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = statusIcons[proposal.status as keyof typeof statusIcons];
  const StatusIcon = statusInfo.icon;
  const isAdmin = currentUser?.role === 'admin';

  const invoiceData = Array.isArray(proposal.invoice) ? proposal.invoice[0] : proposal.invoice;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <button
          onClick={() => navigate('/proposals')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Proposals
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                {proposal.title}
              </h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                <StatusIcon className="h-4 w-4 mr-1" />
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </span>
            </div>
            <p className="text-gray-400 mb-2">
              Client: <span className="text-white font-semibold">{proposal.client?.company || proposal.client?.name}</span>
            </p>
            {proposal.description && (
              <p className="text-gray-500">{proposal.description}</p>
            )}
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-400 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(proposal.value)}
            </p>
          </div>
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-700">
            {proposal.status === 'sent' && (
              <>
                <button
                  onClick={handleApprove}
                  className="flex-1 min-w-[200px] px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
                >
                  Approve Proposal
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 min-w-[200px] px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                  Decline Proposal
                </button>
              </>
            )}

            {(proposal.status === 'sent' || proposal.status === 'approved' || proposal.status === 'declined') && (
              <button
                onClick={handleRevise}
                className={`flex-1 min-w-[200px] px-6 py-3 font-semibold rounded-lg transition-colors ${proposal.status === 'sent'
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-[#3aa3eb] text-white hover:bg-[#2d8bc7]'
                  }`}
              >
                Revise Proposal
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="glass-card rounded-2xl p-1">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all duration-300
                  ${activeTab === tab.id
                    ? 'bg-[#3aa3eb] text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'}
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl p-6 bg-blue-500/5">
              <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                Executive Summary
              </h2>
              <p className="text-gray-300 leading-relaxed">
                This proposal outlines the strategy and deliverables for {proposal.title}.
                View the specific tabs for a detailed breakdown of services, pricing, and timeline.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                Timeline Overview
              </h2>
              <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <CalendarIcon className="h-8 w-8 text-[#3aa3eb]" />
                <div>
                  <p className="text-sm text-gray-400">Target Start Date</p>
                  <p className="text-lg font-bold text-white">
                    {proposal.start_date ? formatAppDate(proposal.start_date) : 'Pending Approval'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {invoiceData && (
              <div className="glass-card rounded-2xl p-6 border border-blue-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                    Current Invoice
                  </h2>
                  <BanknotesIcon className="h-5 w-5 text-[#3aa3eb]" />
                </div>
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Amount:</span>
                    <span className="text-white font-bold text-lg">{formatCurrency(invoiceData.amount * 100)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Status:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${invoiceData.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      invoiceData.status === 'unpaid' || invoiceData.status === 'ready' ? 'bg-[#3aa3eb]/20 text-[#3aa3eb]' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                      {invoiceData.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Key Dates</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Created:</span>
                  <span className="text-white text-sm">{formatAppDate(proposal.created_at)}</span>
                </div>
                {proposal.sent_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Sent:</span>
                    <span className="text-white text-sm">{formatAppDate(proposal.sent_at)}</span>
                  </div>
                )}
                {proposal.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Expires:</span>
                    <span className="text-white text-sm">{formatAppDate(proposal.expires_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'Integral CF, sans-serif' }}>
              Service Breakdown
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-5 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                    <p className="text-sm text-gray-400">{item.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.quantity} x {formatCurrency(item.unit_price_cents)}</p>
                  </div>
                  <p className="text-xl font-bold text-white">{formatCurrency(item.line_total_cents)}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between items-center text-2xl font-bold">
              <span className="text-gray-400">Total Value</span>
              <span className="text-white">{formatCurrency(proposal.value)}</span>
            </div>
          </div>

          {proposal.billing_plan && (
            <div className="glass-card rounded-2xl p-6 border-l-4 border-[#3aa3eb]">
              <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                Payment Schedule
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase">Plan Type</p>
                  <p className="text-lg font-bold text-white capitalize">{proposal.billing_plan.plan_type.replace('_', ' ')}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase">Deposit Required</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(proposal.billing_plan.deposit_cents)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sow' && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Integral CF, sans-serif' }}>Scope of Work</h2>
          <div className="space-y-8">
            {items.map((item) => {
              const template = serviceTemplates.find(t => t.serviceType === item.service_type);
              if (!template) return null;
              return (
                <div key={item.id} className="space-y-4">
                  <h3 className="text-xl font-bold text-[#3aa3eb] border-b border-[#3aa3eb]/20 pb-2">{item.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {template.sowBlocks.map((block: any, idx: number) => (
                      <div key={idx}>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">{block.title}</h4>
                        <ul className="space-y-1">
                          {block.items.map((it: string, i: number) => (
                            <li key={i} className="text-gray-300 text-sm flex gap-2">
                              <span className="text-[#3aa3eb]">•</span> {it}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'Integral CF, sans-serif' }}>Project Timeline</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircleIcon className="h-4 w-4 text-white" />
                </div>
                <div className="w-0.5 flex-1 bg-slate-700 my-2"></div>
              </div>
              <div className="pb-8">
                <p className="text-white font-bold">Proposal Created</p>
                <p className="text-sm text-gray-400">{formatAppDate(proposal.created_at)}</p>
              </div>
            </div>
            {proposal.sent_at && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <ClockIcon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-white font-bold">Sent to Client</p>
                  <p className="text-sm text-gray-400">{formatAppDate(proposal.sent_at)}</p>
                  <p className="text-xs text-blue-400 mt-1">Legal terms locked</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'Integral CF, sans-serif' }}>Activity Log</h2>
          <div className="space-y-6">
            {(proposal.events || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((event: any) => (
              <div key={event.id} className="flex gap-4">
                <div className="bg-slate-800 p-2 rounded-lg">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-white">
                    <span className="font-bold capitalize">{event.type.replace('_', ' ')}</span>
                  </p>
                  <p className="text-xs text-gray-500">{formatAppDate(event.created_at)}</p>
                </div>
              </div>
            ))}
            {(!proposal.events || proposal.events.length === 0) && (
              <p className="text-center text-gray-500 py-10">No activity recorded for this proposal.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
