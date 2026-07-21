import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock,
  Eye,
  XCircle,
  Calendar,
  FileText,
  Banknote,
  ShieldCheck,
  Download,
  Pencil,
  CheckCircle,
  Sparkles,
  Pen,
} from 'lucide-react';
import { proposalService, ProposalItem } from '../lib/proposalService';
import { serviceTemplates } from '../config/serviceTemplates';
import { formatAppDate } from '../lib/dateFormat';
import { useToast } from '../contexts/ToastContext';
import ProposalBuilderModal from './ProposalBuilderModal';
import { UserRole, clientService } from '../lib/supabase';
import { generateProposalPDF } from '../utils/pdfGenerator';
import { termsAndConditionsTemplate } from '../config/termsTemplate';
import { parseMarkdown } from '../lib/markdown';

const SIGNATURE_IMAGE_URL = 'https://wisemedia.io/wp-content/uploads/2026/07/Black-Signature.png';

interface User {
  id?: string;
  email: string;
  role: UserRole;
  name: string;
}

interface ProposalDetailProps {
  currentUser: User | null;
}

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  draft: { label: 'Draft', dot: 'bg-gray-400', text: 'text-gray-300' },
  sent: { label: 'Sent', dot: 'bg-blue-400', text: 'text-blue-300' },
  viewed: { label: 'Viewed', dot: 'bg-blue-400', text: 'text-blue-300' },
  approved: { label: 'Approved', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  declined: { label: 'Declined', dot: 'bg-red-400', text: 'text-red-300' },
  expired: { label: 'Expired', dot: 'bg-orange-400', text: 'text-orange-300' },
  archived: { label: 'Archived', dot: 'bg-gray-500', text: 'text-gray-400' },
};

export default function ProposalDetail({ currentUser }: ProposalDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [proposal, setProposal] = useState<any>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [effectiveClientId, setEffectiveClientId] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [clientSignature, setClientSignature] = useState('');

  useEffect(() => {
    if (id) loadProposal();
  }, [id]);

  const loadProposal = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await proposalService.getById(id);
      if (data) {
        setProposal(data);
        const itemsData = await proposalService.getItems(id);
        setItems(itemsData);
        if (currentUser?.email) {
          const clientRecord = await clientService.getByEmail(currentUser.email).catch(() => null);
          setEffectiveClientId(clientRecord?.id || currentUser.id || null);
        }
      }
    } catch (error) {
      console.error('Error loading proposal:', error);
      toastError('Failed to load proposal details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!proposal) return;
    try {
      setIsGeneratingPDF(true);
      await new Promise((r) => setTimeout(r, 600));
      await generateProposalPDF({
        ...proposal,
        client: proposal.client?.company || proposal.client?.name || 'Client',
        services: items.map((item) => item.name),
      });
      toastSuccess('Proposal PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toastError('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleApprove = () => {
    if (!termsAccepted) {
      toastError('Please read and accept the Terms & Conditions first.');
      const el = document.getElementById('legal-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setClientSignature(currentUser?.name || '');
    document.getElementById('sign-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const confirmApproval = async () => {
    if (!id || !clientSignature.trim()) return;
    try {
      setIsApproving(true);
      await proposalService.approve(id, currentUser?.id, clientSignature, SIGNATURE_IMAGE_URL);
      toastSuccess('Proposal approved and signed.');
      await loadProposal();
    } catch (error) {
      console.error('Error approving proposal:', error);
      toastError('Failed to approve proposal');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    if (!id) return;
    try {
      await proposalService.decline(id, currentUser?.id);
      toastSuccess('Proposal declined.');
      await loadProposal();
    } catch (error) {
      console.error('Error declining proposal:', error);
      toastError('Failed to decline proposal');
    }
  };

  const handleRevise = async () => {
    if (!id) return;
    if (!confirm('Revise this proposal? It will revert to draft so you can edit.')) return;
    try {
      await proposalService.revise(id, currentUser?.id);
      toastSuccess('Proposal reverted to draft.');
      await loadProposal();
    } catch (error) {
      console.error('Error revising proposal:', error);
      toastError('Failed to revise proposal');
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: proposal?.currency || 'CAD' }).format(cents / 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/10 border-t-[#3aa3eb]" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-xl font-semibold text-white mb-3">Proposal Not Found</h2>
        <button onClick={() => navigate('/proposals')} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm transition-colors">
          Back to Proposals
        </button>
      </div>
    );
  }

  const statusMeta = STATUS_META[proposal.status] || STATUS_META.draft;
  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isStaff = userRole === 'staff';
  const isClientRecipient = proposal?.client_id === effectiveClientId;
  const canApproveDecline = isAdmin || isStaff || isClientRecipient;
  const canRevise = isAdmin || isStaff;
  const isApproved = proposal.status === 'approved';
  const canSign = (proposal.status === 'sent' || proposal.status === 'viewed') && canApproveDecline;
  const invoiceData = Array.isArray(proposal.invoice) ? proposal.invoice[0] : proposal.invoice;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/proposals')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Proposals
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
        >
          {isGeneratingPDF ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
          ) : (
            <Download size={15} />
          )}
          PDF
        </button>
      </div>

      {/* Document header */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-8 sm:p-10">
        <div className="flex items-center gap-2 mb-6">
          <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
          <span className={`text-sm font-medium ${statusMeta.text}`}>{statusMeta.label}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {(proposal.title || '').replace(/^\s*(INV|PROP)-\d{3,}\s*[-:]?\s*/i, '').trim()}
        </h1>
        <p className="text-gray-400 text-base leading-relaxed mb-6">
          {proposal.description || `Proposal for ${proposal.client?.company || proposal.client?.name || 'Client'}.`}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} /> Created {formatAppDate(proposal.created_at)}
          </span>
          {proposal.sent_at && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> Sent {formatAppDate(proposal.sent_at)}
            </span>
          )}
          {proposal.expires_at && (
            <span className="flex items-center gap-1.5">
              <Calendar size={14} /> Expires {formatAppDate(proposal.expires_at)}
            </span>
          )}
        </div>
      </div>

      {/* Pricing summary */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-8 sm:p-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">Investment</h2>
        <div className="space-y-3 mb-8">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <p className="text-white font-medium">{item.name}</p>
                {item.description && <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>}
              </div>
              <p className="text-white font-semibold shrink-0">{formatCurrency(item.line_total_cents)}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-6 border-t border-white/[0.06]">
          <span className="text-gray-400">Total</span>
          <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {formatCurrency(proposal.value)}
          </span>
        </div>
        {proposal.billing_plan && (
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-400">
            <span className="px-3 py-1.5 rounded-lg bg-white/5 capitalize">
              {proposal.billing_plan.plan_type.replace('_', ' ')}
            </span>
            {proposal.billing_plan.deposit_cents > 0 && (
              <span className="px-3 py-1.5 rounded-lg bg-white/5">
                Deposit {formatCurrency(proposal.billing_plan.deposit_cents)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Scope of work */}
      {items.some((item) => serviceTemplates.find((t) => t.serviceType === item.service_type)) && (
        <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-8 sm:p-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">Scope of Work</h2>
          <div className="space-y-8">
            {items.map((item) => {
              const template = serviceTemplates.find((t) => t.serviceType === item.service_type);
              if (!template) return null;
              return (
                <div key={item.id}>
                  <h3 className="text-lg font-semibold text-white mb-4">{item.name}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {template.sowBlocks.map((block: any, idx: number) => (
                      <div key={idx}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{block.title}</h4>
                        <ul className="space-y-1.5">
                          {block.items.map((it: string, i: number) => (
                            <li key={i} className="text-sm text-gray-300 flex gap-2">
                              <Check size={14} className="text-[#3aa3eb] shrink-0 mt-0.5" />
                              {it}
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

      {/* Linked invoice */}
      {invoiceData && (
        <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Banknote size={18} className="text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Linked Invoice</p>
                <p className="text-white font-medium">{formatCurrency(invoiceData.amount * 100)}</p>
              </div>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              invoiceData.status === 'paid' ? 'bg-emerald-500/10 text-emerald-300' :
              invoiceData.status === 'unpaid' || invoiceData.status === 'ready' ? 'bg-blue-500/10 text-blue-300' :
              'bg-gray-500/10 text-gray-400'
            }`}>
              {invoiceData.status}
            </span>
          </div>
        </div>
      )}

      {/* Activity timeline */}
      {proposal.events && proposal.events.length > 0 && (
        <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-8 sm:p-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">Activity</h2>
          <div className="space-y-5">
            {[...proposal.events]
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((event: any) => (
                <div key={event.id} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    {event.type === 'signed' ? (
                      <Pen size={14} className="text-[#3aa3eb]" />
                    ) : event.type === 'approved' ? (
                      <CheckCircle size={14} className="text-emerald-400" />
                    ) : (
                      <Clock size={14} className="text-gray-400" />
                    )}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm text-white capitalize">{event.type.replace('_', ' ')}</p>
                    {event.type === 'signed' && event.meta?.signature && (
                      <p className="text-xs text-gray-500">by {event.meta.signature}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-0.5">{formatAppDate(event.created_at)}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Legal / Terms */}
      <div id="legal-section" className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-8 sm:p-10">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck size={18} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Terms & Conditions</h2>
        </div>
        <div className="text-sm text-gray-300 leading-relaxed markdown-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(termsAndConditionsTemplate) }} />
        <div className="mt-6 pt-6 border-t border-white/[0.06] flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5">
            <ShieldCheck size={13} className="text-[#3aa3eb]" />
            Governed by the laws of Alberta, Canada
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5">
            <FileText size={13} className="text-[#3aa3eb]" />
            Includes the Scope of Work above
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5">
            <Pen size={13} className="text-[#3aa3eb]" />
            E-signature binding under Alberta law
          </span>
        </div>
      </div>

      {/* Sign section */}
      {isApproved ? (
        <div className="rounded-3xl bg-emerald-500/[0.04] border border-emerald-500/20 p-8 sm:p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Proposal Approved</h2>
          <p className="text-sm text-gray-400 mb-6">Signed on {formatAppDate(proposal.approved_at)}</p>
          <div className="inline-block bg-white rounded-2xl px-8 py-5">
            <img src={SIGNATURE_IMAGE_URL} alt="Signature" className="h-16 object-contain" />
          </div>
          {canRevise && (
            <div className="mt-6">
              <button onClick={handleRevise} className="text-sm text-gray-400 hover:text-white transition-colors">
                Revise Proposal
              </button>
            </div>
          )}
        </div>
      ) : canSign ? (
        <div id="sign-section" className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-8 sm:p-10 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-[#3aa3eb]" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Review & Approve</h2>
          </div>

          {/* Terms checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="peer h-5 w-5 appearance-none rounded-md border border-white/20 bg-white/5 checked:bg-[#3aa3eb] checked:border-[#3aa3eb] transition-all cursor-pointer"
              />
              <Check size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity left-0.5 pointer-events-none" />
            </div>
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              I have read and agree to the Terms and Conditions
            </span>
          </label>

          {/* Signature input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Type your full name to sign</label>
            <input
              type="text"
              value={clientSignature}
              onChange={(e) => setClientSignature(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-xl italic focus:outline-none focus:border-[#3aa3eb]/50 transition-colors"
              style={{ fontFamily: "'Style Script', cursive" }}
            />
          </div>

          {/* Signature preview */}
          {clientSignature.trim() && (
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl">
              <img src={SIGNATURE_IMAGE_URL} alt="Signature" className="h-14 object-contain" />
              <div className="border-l border-gray-200 pl-4">
                <p className="text-sm text-gray-500">{clientSignature}</p>
                <p className="text-xs text-gray-400">{formatAppDate(new Date())}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={confirmApproval}
              disabled={!clientSignature.trim() || !termsAccepted || isApproving}
              className="flex-1 py-3.5 rounded-xl bg-[#3aa3eb] text-white font-semibold hover:bg-[#59a1e5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isApproving ? 'Signing...' : 'Confirm & Sign'}
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 py-3.5 rounded-xl bg-white/5 text-gray-300 font-semibold hover:bg-white/10 transition-colors"
            >
              Decline
            </button>
          </div>
          {canRevise && (
            <button onClick={handleRevise} className="w-full text-sm text-gray-500 hover:text-white transition-colors pt-2">
              Revise Proposal
            </button>
          )}
        </div>
      ) : canRevise && proposal.status === 'draft' ? (
        <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3aa3eb] text-white font-semibold hover:bg-[#59a1e5] transition-colors"
          >
            <Pencil size={16} /> Modify Proposal
          </button>
        </div>
      ) : null}

      <ProposalBuilderModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          loadProposal();
          setIsEditModalOpen(false);
        }}
        editProposalId={proposal.id}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}
