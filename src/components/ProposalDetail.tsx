import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarIcon,
  EyeIcon,
  XCircleIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon
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
  const [activeTab, setActiveTab] = useState<'overview' | 'sow' | 'timeline'>('overview');

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
        {proposal.status === 'sent' && isAdmin && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-slate-700">
            <button
              onClick={handleApprove}
              className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
            >
              Approve Proposal
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
            >
              Decline Proposal
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="glass-card rounded-2xl p-2">
        <div className="flex gap-2">
          {(['overview', 'sow', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex-1 px-4 py-2 rounded-lg font-semibold transition-colors
                ${activeTab === tab 
                  ? 'bg-[#3aa3eb] text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-800'}
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Services */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                Services & Pricing
              </h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const template = serviceTemplates.find(t => t.serviceType === item.service_type);
                  return (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-slate-800 rounded-lg">
                      <div>
                        <p className="text-white font-semibold">{item.name}</p>
                        <p className="text-sm text-gray-400">
                          {formatCurrency(item.unit_price_cents)} × {item.quantity}
                        </p>
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                        )}
                      </div>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(item.line_total_cents)}
                      </p>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-white">Total:</span>
                    <span className="text-2xl font-bold text-[#3aa3eb]">
                      {formatCurrency(proposal.total_amount_cents)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Linked Invoice */}
            {proposal.invoice && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                  Linked Invoice
                </h2>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-5 w-5 text-blue-400" />
                      <span className="text-white font-semibold">Invoice Status:</span>
                    </div>
                    <span className={`
                      px-3 py-1 rounded-full text-sm font-semibold
                      ${proposal.invoice.status === 'draft' ? 'bg-gray-700 text-gray-300' :
                        proposal.invoice.status === 'unpaid' ? 'bg-orange-500/30 text-orange-400' :
                        proposal.invoice.status === 'paid' ? 'bg-green-500/30 text-green-400' :
                        'bg-red-500/30 text-red-400'}
                    `}>
                      {(proposal.invoice.status || 'pending').charAt(0).toUpperCase() + (proposal.invoice.status || 'pending').slice(1)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount:</span>
                      <span className="text-white font-semibold">
                        {formatCurrency(proposal.value)}
                      </span>
                    </div>
                    {proposal.invoice.status === 'draft' && (
                      <p className="text-blue-300 text-xs mt-2">
                        This invoice will activate automatically when the proposal is approved.
                      </p>
                    )}
                    {proposal.invoice.status === 'unpaid' && proposal.invoice.due_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Due Date:</span>
                        <span className="text-white">{formatAppDate(proposal.invoice.due_at)}</span>
                      </div>
                    )}
                    {proposal.invoice.status !== 'draft' && (
                      <button
                        onClick={() => navigate('/invoices')}
                        className="w-full mt-3 px-4 py-2 bg-[#3aa3eb] text-white rounded-lg hover:bg-[#2d8bc7] transition-colors"
                      >
                        View Invoice →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Dates */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Key Dates</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Created</p>
                  <p className="text-white">{formatAppDate(proposal.created_at)}</p>
                </div>
                {proposal.sent_at && (
                  <div>
                    <p className="text-sm text-gray-400">Sent</p>
                    <p className="text-white">{formatAppDate(proposal.sent_at)}</p>
                  </div>
                )}
                {proposal.approved_at && (
                  <div>
                    <p className="text-sm text-gray-400">Approved</p>
                    <p className="text-white">{formatAppDate(proposal.approved_at)}</p>
                  </div>
                )}
                {proposal.declined_at && (
                  <div>
                    <p className="text-sm text-gray-400">Declined</p>
                    <p className="text-white">{formatAppDate(proposal.declined_at)}</p>
                  </div>
                )}
                {proposal.expires_at && (
                  <div>
                    <p className="text-sm text-gray-400">Expires</p>
                    <p className="text-white">{formatAppDate(proposal.expires_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Info */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Client Information</h2>
              <div className="space-y-2">
                <p className="text-white font-semibold">
                  {proposal.client?.company || proposal.client?.name}
                </p>
                {proposal.client?.email && (
                  <p className="text-sm text-gray-400">{proposal.client.email}</p>
                )}
                {proposal.client?.phone && (
                  <p className="text-sm text-gray-400">{proposal.client.phone}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sow' && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Integral CF, sans-serif' }}>
            Scope of Work
          </h2>
          <div className="space-y-6">
            {items.map((item) => {
              const template = serviceTemplates.find(t => t.serviceType === item.service_type);
              if (!template) return null;

              return (
                <div key={item.id} className="border border-slate-700 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">{template.label}</h3>
                  {template.sowBlocks.map((block, idx) => (
                    <div key={idx} className="mb-4">
                      <h4 className="text-sm font-bold text-[#3aa3eb] mb-2">{block.title}</h4>
                      <ul className="text-sm text-gray-300 space-y-1 pl-4">
                        {block.items.map((blockItem, itemIdx) => (
                          <li key={itemIdx} className="list-disc">{blockItem}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {proposal.status === 'sent' || proposal.status === 'approved' ? (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-300">
                <strong>✓ Legal Terms Locked:</strong> This SOW and all legal clauses were locked when the proposal was sent.
              </p>
            </div>
          ) : (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>Note:</strong> SOW and legal clauses will be locked when this proposal is sent.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Integral CF, sans-serif' }}>
            Status Timeline
          </h2>
          <div className="space-y-4">
            {/* Timeline items */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 w-0.5 bg-slate-700 mt-2"></div>
              </div>
              <div className="flex-1 pb-8">
                <p className="text-white font-semibold">Created</p>
                <p className="text-sm text-gray-400">{formatAppDate(proposal.created_at)}</p>
              </div>
            </div>

            {proposal.sent_at && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  </div>
                  {(proposal.approved_at || proposal.declined_at) && (
                    <div className="flex-1 w-0.5 bg-slate-700 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <p className="text-white font-semibold">Sent to Client</p>
                  <p className="text-sm text-gray-400">{formatAppDate(proposal.sent_at)}</p>
                  <p className="text-xs text-gray-500 mt-1">Legal terms locked</p>
                </div>
              </div>
            )}

            {proposal.approved_at && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Approved</p>
                  <p className="text-sm text-gray-400">{formatAppDate(proposal.approved_at)}</p>
                  <p className="text-xs text-green-400 mt-1">Invoice activated</p>
                </div>
              </div>
            )}

            {proposal.declined_at && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                    <XCircleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Declined</p>
                  <p className="text-sm text-gray-400">{formatAppDate(proposal.declined_at)}</p>
                  <p className="text-xs text-red-400 mt-1">Invoice voided</p>
                </div>
              </div>
            )}

            {!proposal.sent_at && !proposal.approved_at && !proposal.declined_at && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 font-semibold">Awaiting Action</p>
                  <p className="text-sm text-gray-500">Proposal is in draft status</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
