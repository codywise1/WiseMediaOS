import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseAvailable, UserRole } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import {
  FileText,
  CreditCard,
  Pencil,
  Trash2,
  Mail,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Link as LinkIcon,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import InvoiceModal from './InvoiceModal';
import ConfirmDialog from './ConfirmDialog';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import PaymentModal from './PaymentModal';

function isInvoiceOverdue(inv: { status: string; due_date: string | null; paid_at: string | null }): boolean {
  if (inv.status === 'paid' || inv.status === 'void' || inv.status === 'draft') return false;
  if (inv.status === 'overdue') return true;
  if (!inv.due_date) return false;
  const due = new Date(inv.due_date);
  if (isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
}

function daysOverdue(inv: { status: string; due_date: string | null }): number | null {
  if (!isInvoiceOverdue(inv)) return null;
  if (!inv.due_date) return null;
  const due = new Date(inv.due_date);
  return Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24));
}

interface InvoiceRow {
  id: string;
  public_id: string | null;
  client_id: string | null;
  amount: number | string | null;
  title: string | null;
  description: string | null;
  proposal_id: string | null;
  status: string | null;
  currency: string | null;
  due_date: string | null;
  due_at: string | null;
  issued_at: string | null;
  created_at: string | null;
  paid_at: string | null;
  updated_at: string | null;
  client?: { name: string | null; email: string | null } | null;
  invoice_projects?: { project_id: string; project: { id: string; name: string } }[] | null;
  proposal?: { id: string; title: string } | null;
}

interface InvoiceView {
  id: string;
  number: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  client: string;
  client_email: string;
  client_id: string | null;
  proposal_id: string | null;
  proposal_title: string | null;
  created_at: string;
  due_date: string | null;
  paid_at: string | null;
  updated_at: string;
  project_ids: string[];
  project_names: string[];
}

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface InvoicesProps {
  currentUser: User | null;
}

export default function Invoices({ currentUser }: InvoicesProps) {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceView | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'overdue' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [isMobile, setIsMobile] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [generatingPDFId, setGeneratingPDFId] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      if (!isSupabaseAvailable() || !supabase) {
        setInvoices([]);
        setLoadError('Database is not configured.');
        return;
      }

      const { data, error: queryError } = await supabase
        .from('invoices')
        .select(`
          id, public_id, client_id, amount, title, description, proposal_id, status, currency,
          due_date, due_at, issued_at, created_at, paid_at, updated_at,
          client:clients(name, email),
          invoice_projects(project_id, project:projects(id, name)),
          proposal:proposals(id, title)
        `)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      if (!data) {
        setInvoices([]);
        return;
      }

      const mapped: InvoiceView[] = (data as InvoiceRow[]).map(row => {
        const clientName = row.client?.name || row.client?.email || 'Unknown Client';
        const clientEmail = row.client?.email || '';
        const ipLinks = row.invoice_projects || [];
        const project_ids = ipLinks.map(l => l.project_id);
        const project_names = ipLinks.map(l => l.project?.name).filter(Boolean) as string[];
        const proposalData = Array.isArray(row.proposal) ? row.proposal[0] : row.proposal;
        return {
          id: row.id,
          number: row.public_id || `INV-${row.id.slice(0, 6).toUpperCase()}`,
          title: row.title || row.description || 'Untitled Invoice',
          amount: Number(row.amount) || 0,
          currency: (row.currency || 'USD').toLowerCase(),
          status: row.status || 'pending',
          description: row.description || '',
          client: clientName,
          client_email: clientEmail,
          client_id: row.client_id,
          proposal_id: row.proposal_id || null,
          proposal_title: proposalData?.title || null,
          created_at: row.created_at || '',
          due_date: row.due_date || row.due_at || null,
          paid_at: row.paid_at || null,
          updated_at: row.updated_at || row.paid_at || row.created_at || '',
          project_ids,
          project_names,
        };
      });

      setInvoices(mapped);
    } catch (error) {
      console.error('Error loading invoices:', error);
      const msg = error instanceof Error ? error.message : 'Failed to load invoices.';
      setLoadError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const totalPending = invoices
    .filter(inv => inv.status === 'pending' || inv.status === 'unpaid' || inv.status === 'ready')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = invoices
    .filter(inv => isInvoiceOverdue(inv))
    .reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const totalOutstanding = totalPending + totalOverdue;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const currentQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

  const paidDate = (inv: InvoiceView) => inv.paid_at || inv.updated_at || inv.created_at;

  const revenue7d = invoices
    .filter(inv => inv.status === 'paid' && new Date(paidDate(inv)) >= sevenDaysAgo)
    .reduce((sum, inv) => sum + inv.amount, 0);
  const revenue30d = invoices
    .filter(inv => inv.status === 'paid' && new Date(paidDate(inv)) >= thirtyDaysAgo)
    .reduce((sum, inv) => sum + inv.amount, 0);
  const revenueQuarter = invoices
    .filter(inv => inv.status === 'paid' && new Date(paidDate(inv)) >= currentQuarterStart)
    .reduce((sum, inv) => sum + inv.amount, 0);

  const periodTitleMap: Record<typeof chartPeriod, string> = {
    day: 'DAILY REVENUE',
    week: 'WEEKLY REVENUE',
    month: 'MONTHLY REVENUE',
    quarter: 'QUARTERLY REVENUE',
    year: 'YEARLY REVENUE',
  };

  const getChartData = (): { label: string; value: number }[] => {
    const basePointsCount = isMobile ? 4 : 8;
    switch (chartPeriod) {
      case 'day': {
        return Array.from({ length: basePointsCount }).map((_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (basePointsCount - 1 - i));
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
          const dayRevenue = invoices
            .filter(inv => {
              const invDate = new Date(paidDate(inv));
              return inv.status === 'paid' && invDate >= dayStart && invDate < dayEnd;
            })
            .reduce((sum, inv) => sum + inv.amount, 0);
          const monthAbbr = d.toLocaleDateString('en-US', { month: 'short' });
          return { label: `${monthAbbr} ${d.getDate()}`, value: dayRevenue };
        });
      }
      case 'week': {
        return Array.from({ length: basePointsCount }).map((_, i) => {
          const weekOffset = basePointsCount - 1 - i;
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() - weekOffset * 7);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const weekRevenue = invoices
            .filter(inv => {
              const invDate = new Date(paidDate(inv));
              return inv.status === 'paid' && invDate >= weekStart && invDate < weekEnd;
            })
            .reduce((sum, inv) => sum + inv.amount, 0);
          const monthAbbr = weekStart.toLocaleDateString('en-US', { month: 'short' });
          return { label: `${monthAbbr} ${weekStart.getDate()}`, value: weekRevenue };
        });
      }
      case 'month': {
        return Array.from({ length: basePointsCount }).map((_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (basePointsCount - 1 - i), 1);
          const monthRevenue = invoices
            .filter(inv => {
              const invDate = new Date(paidDate(inv));
              return inv.status === 'paid' &&
                invDate.getMonth() === d.getMonth() &&
                invDate.getFullYear() === d.getFullYear();
            })
            .reduce((sum, inv) => sum + inv.amount, 0);
          const monthAbbr = d.toLocaleDateString('en-US', { month: 'short' });
          return { label: `${monthAbbr} '${String(d.getFullYear()).slice(-2)}`, value: monthRevenue };
        });
      }
      case 'quarter': {
        const quarterCount = isMobile ? 4 : 6;
        return Array.from({ length: quarterCount }).map((_, i) => {
          const quarterOffset = quarterCount - 1 - i;
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const targetQuarter = (currentQuarter - quarterOffset + 40) % 4;
          const yearOffset = Math.floor((quarterOffset - currentQuarter + 3) / 4);
          const targetYear = now.getFullYear() - yearOffset;
          const quarterStart = new Date(targetYear, targetQuarter * 3, 1);
          const quarterEnd = new Date(targetYear, targetQuarter * 3 + 3, 1);
          const quarterRevenue = invoices
            .filter(inv => {
              const invDate = new Date(paidDate(inv));
              return inv.status === 'paid' && invDate >= quarterStart && invDate < quarterEnd;
            })
            .reduce((sum, inv) => sum + inv.amount, 0);
          return { label: `Q${targetQuarter + 1} '${String(targetYear).slice(-2)}`, value: quarterRevenue };
        });
      }
      case 'year': {
        const yearCount = isMobile ? 3 : 5;
        return Array.from({ length: yearCount }).map((_, i) => {
          const targetYear = now.getFullYear() - (yearCount - 1 - i);
          const yearStart = new Date(targetYear, 0, 1);
          const yearEnd = new Date(targetYear + 1, 0, 1);
          const yearRevenue = invoices
            .filter(inv => {
              const invDate = new Date(paidDate(inv));
              return inv.status === 'paid' && invDate >= yearStart && invDate < yearEnd;
            })
            .reduce((sum, inv) => sum + inv.amount, 0);
          return { label: String(targetYear), value: yearRevenue };
        });
      }
      default:
        return [];
    }
  };

  const chartData = getChartData();
  const chartTotal = chartData.reduce((s, d) => s + d.value, 0);
  const chartMaxVal = Math.max(...chartData.map(d => d.value), 1);
  const chartAvg = chartData.length > 0 ? chartTotal / chartData.length : 0;

  const handleNewInvoice = () => {
    setSelectedInvoice(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditInvoice = (invoice: InvoiceView) => {
    setSelectedInvoice(invoice);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteInvoice = (invoice: InvoiceView) => {
    setSelectedInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveInvoice = async (invoiceData: any) => {
    try {
      if (modalMode === 'edit' && selectedInvoice) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            title: invoiceData.title || null,
            amount: Number(invoiceData.amount) || 0,
            description: invoiceData.description || null,
            status: invoiceData.status || 'pending',
            due_date: invoiceData.due_date || null,
            client_id: invoiceData.client_id || null,
            proposal_id: invoiceData.proposal_id || null,
            issued_at: invoiceData.issued_at || null,
            paid_at: invoiceData.paid_at || null,
          })
          .eq('id', selectedInvoice.id);
        if (updateError) throw updateError;

        // Sync many-to-many project links
        await syncInvoiceProjects(selectedInvoice.id, invoiceData.project_ids || []);
        toastSuccess('Invoice updated.');
      } else {
        const insertPayload: any = {
          title: invoiceData.title || null,
          amount: Number(invoiceData.amount) || 0,
          description: invoiceData.description || null,
          status: invoiceData.status || 'pending',
          due_date: invoiceData.due_date || null,
          client_id: invoiceData.client_id || null,
          proposal_id: invoiceData.proposal_id || null,
          currency: 'USD',
          issued_at: invoiceData.issued_at || null,
          paid_at: invoiceData.paid_at || null,
        };
        const { data: newInvoice, error: insertError } = await supabase
          .from('invoices')
          .insert(insertPayload)
          .select('id')
          .single();
        if (insertError) throw insertError;

        await syncInvoiceProjects(newInvoice.id, invoiceData.project_ids || []);
        toastSuccess('Invoice created.');
      }
      setIsModalOpen(false);
      await loadInvoices();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toastError(error instanceof Error ? error.message : 'Failed to save invoice.');
    }
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;
    try {
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', selectedInvoice.id);
      if (deleteError) throw deleteError;
      toastSuccess('Invoice deleted.');
      setIsDeleteDialogOpen(false);
      setSelectedInvoice(undefined);
      await loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toastError(error instanceof Error ? error.message : 'Failed to delete invoice.');
    }
  };

  const handlePayInvoice = (invoice: InvoiceView) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    await loadInvoices();
  };

  const handleDownloadPDF = async (invoice: InvoiceView) => {
    try {
      setGeneratingPDFId(invoice.id);
      await generateInvoicePDF({
        ...invoice,
        createdDate: invoice.created_at,
        dueDate: invoice.due_date || '',
      } as any);
    } finally {
      setGeneratingPDFId(null);
    }
  };

  const handleSendReminder = (invoice: InvoiceView) => {
    toastSuccess(`Payment reminder queued for ${invoice.client} (${invoice.amount.toLocaleString()}).`);
  };

  const syncInvoiceProjects = async (invoiceId: string, projectIds: string[]) => {
    // Remove all existing links, then insert the new set
    const { error: delError } = await supabase
      .from('invoice_projects')
      .delete()
      .eq('invoice_id', invoiceId);
    if (delError) throw delError;
    if (projectIds.length > 0) {
      const rows = projectIds.map(pid => ({ invoice_id: invoiceId, project_id: pid }));
      const { error: insError } = await supabase.from('invoice_projects').insert(rows);
      if (insError) throw insError;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3aa3eb]"></div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  const filteredInvoices = invoices
    .filter(inv => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'unpaid') return inv.status === 'pending' || inv.status === 'unpaid' || inv.status === 'ready';
      if (filterStatus === 'overdue') return isInvoiceOverdue(inv);
      if (filterStatus === 'paid') return inv.status === 'paid';
      return inv.status === filterStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
        case 'date_desc':
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const exportCSV = () => {
    const headers = ['Invoice', 'Client', 'Status', 'Amount', 'Due Date'];
    const rows = filteredInvoices.map(inv => [
      inv.number,
      inv.client,
      inv.status,
      inv.amount.toString(),
      inv.due_date ? formatAppDate(inv.due_date) : 'N/A',
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display font-bold gradient-text leading-tight tracking-tight uppercase mb-2" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)' }}>Invoices</h1>
            <p className="text-gray-300">
              {isAdmin
                ? 'Track billing, payments, and outstanding balances.'
                : 'View invoices, payment status, and billing history.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleNewInvoice}
              className="btn-header-glass space-x-2 shrink-0 w-full sm:w-auto"
            >
              <span className="btn-text-glow">New Invoice</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="glass-card rounded-2xl p-4 border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-200">{loadError}</p>
          </div>
        </div>
      )}

      {/* Main Charts & Revenue Snapshot Section */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 rounded-3xl p-6 sm:p-8 relative overflow-hidden group border border-white/[0.08]"
            style={{
              background: 'rgba(28, 28, 30, 0.6)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#3aa3eb]/[0.04] via-transparent to-transparent pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 relative z-10 gap-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-widest uppercase" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>{periodTitleMap[chartPeriod]}</h2>
                <p className="text-xs text-gray-400 mt-1 font-medium">
                  Total: <span className="text-white font-bold tabular-nums">${chartData.reduce((s, d) => s + d.value, 0).toLocaleString()}</span>
                </p>
              </div>
              <div
                className="flex gap-0.5 p-0.5 rounded-xl"
                style={{
                  background: 'rgba(120, 120, 128, 0.16)',
                }}
              >
                {(['day', 'week', 'month', 'quarter', 'year'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={`px-3 sm:px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all duration-200 ${
                      chartPeriod === period
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif',
                      background: chartPeriod === period
                        ? 'linear-gradient(180deg, #3aa3eb 0%, #2d8fd4 100%)'
                        : 'transparent',
                      boxShadow: chartPeriod === period
                        ? '0 1px 3px rgba(0,0,0,0.3), 0 0 12px rgba(58,163,235,0.25)'
                        : 'none',
                    }}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <SaaSGrowthChart data={chartData} total={chartTotal} avg={chartAvg} maxVal={chartMaxVal} />
          </div>

          {/* Revenue Snapshot */}
          <div className="rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-white/[0.08]"
            style={{
              background: 'rgba(28, 28, 30, 0.6)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            }}
          >
            <h2 className="text-lg font-bold text-white tracking-widest uppercase mb-6" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>REVENUE SNAPSHOT</h2>
            <div className="space-y-3">
              {[
                { label: 'Last 7 Days', value: revenue7d, icon: ArrowRight, accent: 'text-[#3aa3eb]' },
                { label: 'Last 30 Days', value: revenue30d, icon: ArrowRight, accent: 'text-green-400' },
                { label: 'This Quarter', value: revenueQuarter, icon: ArrowRight, accent: 'text-purple-400' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-gradient-to-b from-[#3aa3eb] to-[#3aa3eb]/30" />
                    <span className="text-sm text-gray-300 font-medium">{item.label}</span>
                  </div>
                  <span className="text-xl font-black text-white tabular-nums" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Collected</span>
                <span className="text-2xl font-black text-green-400 tabular-nums" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>${totalPaid.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini Stats Cards */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[
            { label: 'Invoices Sent · 30d', value: invoices.length, icon: Eye, iconBg: 'bg-[#3aa3eb]/20' },
            { label: 'Total Cash Collected', value: `${totalPaid.toLocaleString()}`, icon: CheckCircle, iconBg: 'bg-green-500/20' },
            { label: 'Overdue Funds', value: `${totalOverdue.toLocaleString()}`, icon: AlertTriangle, iconBg: 'bg-red-500/20' },
            { label: 'Total Outstanding', value: `${totalOutstanding.toLocaleString()}`, icon: CreditCard, iconBg: 'bg-blue-500/20' },
          ].map((stat, idx) => (
            <div key={idx} className="glass-card rounded-2xl p-4 sm:p-6 flex items-center gap-3 sm:gap-4 transition-all duration-300 hover-glow border border-white/10">
              <div className={`p-2 sm:p-3 rounded-xl ${stat.iconBg} shrink-0`}>
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-white font-medium mb-1 truncate">{stat.label}</p>
                <p className="text-lg sm:text-2xl font-bold text-white tabular-nums" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Cards — iOS Style */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto ios-scroll">
            {[
              { id: 'all', label: 'All', count: invoices.length },
              { id: 'unpaid', label: 'Unpaid', count: invoices.filter(i => i.status !== 'paid').length },
              { id: 'overdue', label: 'Overdue', count: invoices.filter(i => isInvoiceOverdue(i)).length },
              { id: 'paid', label: 'Paid', count: invoices.filter(i => i.status === 'paid').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${filterStatus === tab.id
                  ? 'bg-[#3aa3eb] text-white shadow-[0_0_15px_rgba(58,163,235,0.4)]'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                {tab.label} <span className="opacity-50 ml-1">({tab.count})</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <button
              onClick={exportCSV}
              className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-2 group transition-all"
            >
              Export CSV
              <Download className="h-4 w-4 group-hover:translate-y-[1px] transition-transform" />
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-xs sm:text-sm font-medium focus:border-[#3aa3eb] focus:ring-2 focus:ring-[#3aa3eb]/20 transition-all"
            >
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Amount: High → Low</option>
              <option value="amount_asc">Amount: Low → High</option>
            </select>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center border border-white/10">
            <FileText className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-500">No invoices found</h3>
            <p className="text-gray-600 text-sm mt-1">
              {invoices.length === 0
                ? 'No invoices have been created yet. Click "New Invoice" to get started.'
                : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredInvoices.map((invoice) => {
              const isPaid = invoice.status === 'paid';
              const isOverdue = isInvoiceOverdue(invoice);
              const isPending = invoice.status === 'pending' || invoice.status === 'unpaid' || invoice.status === 'ready';

              const statusStyles: Record<string, { bg: string, border: string, text: string, dot: string }> = {
                paid: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', text: 'rgb(74, 222, 128)', dot: 'bg-green-500' },
                overdue: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: 'rgb(248, 113, 113)', dot: 'bg-red-500' },
                pending: { bg: 'rgba(59, 163, 234, 0.15)', border: 'rgba(59, 163, 234, 0.4)', text: 'rgb(96, 165, 250)', dot: 'bg-[#3aa3eb]' },
                unpaid: { bg: 'rgba(59, 163, 234, 0.15)', border: 'rgba(59, 163, 234, 0.4)', text: 'rgb(96, 165, 250)', dot: 'bg-[#3aa3eb]' },
                ready: { bg: 'rgba(59, 163, 234, 0.15)', border: 'rgba(59, 163, 234, 0.4)', text: 'rgb(96, 165, 250)', dot: 'bg-[#3aa3eb]' },
                default: { bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)', text: 'rgb(203, 213, 225)', dot: 'bg-slate-500' }
              };
              const style = statusStyles[invoice.status.toLowerCase()] || statusStyles.default;

              // Due date calculation
              const dueDateStr = invoice.due_date || '';
              let dueDisplay = '';
              let dueColor = 'text-gray-400';
              if (isPaid) {
                dueDisplay = `Paid on ${formatAppDate(invoice.paid_at || invoice.updated_at || invoice.created_at)}`;
                dueColor = 'text-green-400';
              } else if (!dueDateStr) {
                dueDisplay = isOverdue ? 'Overdue' : 'No due date';
                dueColor = isOverdue ? 'text-red-400' : 'text-gray-400';
              } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = new Date(dueDateStr.includes('T') ? dueDateStr : dueDateStr + 'T00:00:00');
                if (!isNaN(dueDate.getTime())) {
                  dueDate.setHours(0, 0, 0, 0);
                  const diff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                  if (isOverdue) {
                    dueDisplay = diff === 0 ? 'Overdue · Today' : `Overdue · ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'Day' : 'Days'}`;
                    dueColor = 'text-red-400';
                  } else if (diff === 0) {
                    dueDisplay = 'Due Today';
                    dueColor = 'text-yellow-400';
                  } else if (diff < 0) {
                    dueDisplay = `Overdue ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'Day' : 'Days'}`;
                    dueColor = 'text-red-400';
                  } else {
                    dueDisplay = `Due in ${diff} ${diff === 1 ? 'Day' : 'Days'}`;
                    dueColor = 'text-gray-400';
                  }
                }
              }

              return (
                <div
                  key={invoice.id}
                  className="ios-card group relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden transition-all duration-300 hover:bg-white/[0.06] hover:border-white/15 hover:shadow-2xl hover:shadow-black/20"
                >
                  <div className="p-5 space-y-4">
                    {/* Top: Invoice number + status pill */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className={`w-1 h-5 rounded-full ${style.dot} shrink-0`} />
                          <span className="text-[10px] font-black text-gray-500 tracking-widest shrink-0" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>
                            {invoice.number}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white truncate leading-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>
                          {invoice.title}
                        </h3>
                        {invoice.proposal_title && (
                          <a
                            href={`/proposals`}
                            className="inline-flex items-center gap-1 mt-1 text-[10px] text-[#3aa3eb] hover:text-[#59a1e5] transition-colors"
                          >
                            <LinkIcon className="h-3 w-3" />
                            {invoice.proposal_title}
                          </a>
                        )}
                      </div>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0"
                        style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>

                    {/* Client + Amount */}
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-200 truncate">{invoice.client}</p>
                        <p className={`text-xs font-medium mt-1 ${dueColor}`}>{dueDisplay}</p>
                        {invoice.project_names.length > 0 && (
                          <p className="text-[10px] text-gray-500 mt-1 truncate">
                            {invoice.project_names.length === 1 ? invoice.project_names[0] : `${invoice.project_names.length} projects`}
                          </p>
                        )}
                      </div>
                      <span className="text-2xl font-black text-white tracking-tight shrink-0" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>
                        ${invoice.amount.toLocaleString()}
                      </span>
                    </div>

                    {/* Bottom: Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <button
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#3aa3eb] hover:text-white transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDownloadPDF(invoice)}
                          disabled={generatingPDFId === invoice.id}
                          className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                          title="Download PDF"
                        >
                          {generatingPDFId === invoice.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => handleSendReminder(invoice)}
                              className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-[#3aa3eb] hover:bg-[#3aa3eb]/10 transition-all"
                              title="Send Reminder"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditInvoice(invoice)}
                              className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (invoice.status === 'pending' || isOverdue) ? (
                          <button
                            onClick={() => handlePayInvoice(invoice)}
                            className="px-4 py-2 rounded-xl bg-[#3aa3eb] text-white text-[10px] font-black tracking-widest hover:scale-105 transition-all shadow-[0_0_15px_rgba(58,163,235,0.4)]"
                          >
                            Pay Now
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveInvoice}
        invoice={selectedInvoice as any}
        mode={modalMode}
        currentUser={currentUser}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Invoice"
        message={
          selectedInvoice
            ? `Are you sure you want to delete "${selectedInvoice.title || selectedInvoice.description || selectedInvoice.client}" (${selectedInvoice.amount.toLocaleString()})?`
            : 'Are you sure you want to delete this invoice?'
        }
      />

      {selectedInvoice && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedInvoice(undefined);
          }}
          invoice={selectedInvoice as any}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

// ─── SaaS-style growth chart ───────────────────────────────────────────────
function SaaSGrowthChart({
  data, total, avg, maxVal,
}: {
  data: { label: string; value: number }[];
  total: number;
  avg: number;
  maxVal: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const PAD_L = 48;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 32;
  const H = 260;
  const plotW = Math.max(width - PAD_L - PAD_R, 10);
  const plotH = H - PAD_T - PAD_B;
  const n = data.length;

  const niceMax = (() => {
    if (maxVal <= 0) return 1000;
    const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil(maxVal / mag) * mag;
  })();

  const xOf = (i: number) => PAD_L + (n <= 1 ? plotW / 2 : (plotW / (n - 1)) * i);
  const yOf = (v: number) => PAD_T + plotH - (v / niceMax) * plotH;

  const linePath = data.map((d, i) => {
    const x = xOf(i), y = yOf(d.value);
    if (i === 0) return `M${x},${y}`;
    const px = xOf(i - 1), py = yOf(data[i - 1].value);
    const cpx = (px + x) / 2;
    return `C${cpx},${py} ${cpx},${y} ${x},${y}`;
  }).join(' ');

  const areaPath = linePath + ` L${xOf(n - 1)},${PAD_T + plotH} L${xOf(0)},${PAD_T + plotH} Z`;

  const gridLines = 4;
  const fmtY = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
    return `${Math.round(v)}`;
  };

  const totalChange = data.length >= 2 ? (() => {
    const first = data[0].value, last = data[data.length - 1].value;
    if (first === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 100);
  })() : 0;

  return (
    <div>
      {/* Summary row */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
            ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Avg ${avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}/period
          </p>
        </div>
        {data.length >= 2 && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            totalChange >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
          }`}>
            <span>{totalChange >= 0 ? '↗' : '↘'}</span>
            {Math.abs(totalChange)}% {totalChange >= 0 ? 'growth' : 'decline'}
          </div>
        )}
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full select-none">
        <svg width={width} height={H} style={{ display: 'block', overflow: 'visible' }}
          onMouseLeave={() => setHovered(null)}>
          <defs>
            <linearGradient id="saasArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3aa3eb" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3aa3eb" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid + Y labels */}
          {Array.from({ length: gridLines + 1 }).map((_, gi) => {
            const frac = gi / gridLines;
            const y = PAD_T + plotH - frac * plotH;
            const val = frac * niceMax;
            return (
              <g key={gi}>
                <line x1={PAD_L} y1={y} x2={width - PAD_R} y2={y}
                  stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                <text x={PAD_L - 8} y={y} textAnchor="end" dominantBaseline="middle"
                  fill="rgba(255,255,255,0.3)" fontSize={11} className="tabular-nums">
                  {fmtY(val)}
                </text>
              </g>
            );
          })}

          {/* Hover guideline */}
          {hovered !== null && (
            <line x1={xOf(hovered)} y1={PAD_T} x2={xOf(hovered)} y2={PAD_T + plotH}
              stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4 4" />
          )}

          {/* Area fill */}
          <motion.path d={areaPath} fill="url(#saasArea)"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />

          {/* Line */}
          <motion.path d={linePath} fill="none" stroke="#3aa3eb" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }} />

          {/* Points + hitboxes */}
          {data.map((d, i) => {
            const x = xOf(i), y = yOf(d.value);
            const isHov = hovered === i;
            const colW = plotW / n;
            return (
              <g key={i}>
                <rect x={x - colW / 2} y={PAD_T} width={colW} height={plotH}
                  fill="transparent" onMouseEnter={() => setHovered(i)} />
                <circle cx={x} cy={y} r={isHov ? 6 : 4}
                  fill={isHov ? '#3aa3eb' : '#0f1a24'} stroke="#3aa3eb"
                  strokeWidth={isHov ? 2.5 : 2}
                  style={{ transition: 'r 0.15s, fill 0.15s' }} />
                {isHov && (
                  <g>
                    <rect x={Math.min(Math.max(x - 60, PAD_L), width - PAD_R - 120)} y={y - 48}
                      width={120} height={38} rx={10}
                      fill="rgba(28,28,30,0.92)" stroke="rgba(58,163,235,0.3)" strokeWidth={1} />
                    <text x={Math.min(Math.max(x - 60, PAD_L), width - PAD_R - 120) + 60}
                      y={y - 33} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={10}>
                      {d.label}
                    </text>
                    <text x={Math.min(Math.max(x - 60, PAD_L), width - PAD_R - 120) + 60}
                      y={y - 18} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={600}>
                      ${d.value.toLocaleString()}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* X labels */}
          {data.map((d, i) => (
            <text key={i} x={xOf(i)} y={H - 10} textAnchor="middle"
              fill={hovered === i ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)'}
              fontSize={11} fontWeight={hovered === i ? 600 : 400}
              style={{ transition: 'fill 0.15s' }}>
              {d.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
