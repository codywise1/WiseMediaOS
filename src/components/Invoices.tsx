import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseAvailable, UserRole } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import {
  DocumentIcon,
  CreditCardIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ArrowRight } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import InvoiceModal from './InvoiceModal';
import ConfirmDialog from './ConfirmDialog';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import PaymentModal from './PaymentModal';

interface InvoiceRow {
  id: string;
  public_id: string | null;
  client_id: string | null;
  amount: number | string | null;
  description: string | null;
  status: string | null;
  currency: string | null;
  due_date: string | null;
  due_at: string | null;
  issued_at: string | null;
  created_at: string | null;
  paid_at: string | null;
  updated_at: string | null;
  client?: { name: string | null; email: string | null } | null;
}

interface InvoiceView {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  client: string;
  client_email: string;
  client_id: string | null;
  created_at: string;
  due_date: string | null;
  paid_at: string | null;
  updated_at: string;
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
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
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
          id, public_id, client_id, amount, description, status, currency,
          due_date, due_at, issued_at, created_at, paid_at, updated_at,
          client:clients(name, email)
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
        return {
          id: row.id,
          number: row.public_id || `INV-${row.id.slice(0, 6).toUpperCase()}`,
          amount: Number(row.amount) || 0,
          currency: (row.currency || 'USD').toLowerCase(),
          status: row.status || 'pending',
          description: row.description || '',
          client: clientName,
          client_email: clientEmail,
          client_id: row.client_id,
          created_at: row.created_at || '',
          due_date: row.due_date || row.due_at || null,
          paid_at: row.paid_at || null,
          updated_at: row.updated_at || row.paid_at || row.created_at || '',
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
    .filter(inv => inv.status === 'overdue')
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

  const getChartData = () => {
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
          const spacing = 800 / (basePointsCount + 1);
          const monthAbbr = d.toLocaleDateString('en-US', { month: 'short' });
          return { label: `${monthAbbr}. ${d.getDate()}`, value: dayRevenue, x: spacing * (i + 1) };
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
          const spacing = 800 / (basePointsCount + 1);
          const monthAbbr = weekStart.toLocaleDateString('en-US', { month: 'short' });
          return { label: `${monthAbbr}. ${weekStart.getDate()}`, value: weekRevenue, x: spacing * (i + 1) };
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
          const spacing = 800 / (basePointsCount + 1);
          const monthAbbr = d.toLocaleDateString('en-US', { month: 'short' });
          return { label: `${monthAbbr} '${String(d.getFullYear()).slice(-2)}`, value: monthRevenue, x: spacing * (i + 1) };
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
          const spacing = 800 / (quarterCount + 1);
          return { label: `Q${targetQuarter + 1} '${String(targetYear).slice(-2)}`, value: quarterRevenue, x: spacing * (i + 1) };
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
          const spacing = 800 / (yearCount + 1);
          return { label: String(targetYear), value: yearRevenue, x: spacing * (i + 1) };
        });
      }
      default:
        return [];
    }
  };

  const chartData = getChartData();
  const chartPointsCount = chartData.length;
  const maxVal = Math.max(...chartData.map(d => d.value), 1000);
  const chartPoints = chartData.map(d => ({
    x: d.x,
    y: 180 - (d.value / maxVal) * 150,
  }));

  const areaPath = `M ${chartPoints[0]?.x ?? 0} 200 ` +
    chartPoints.map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${chartPoints[chartPoints.length - 1]?.x ?? 0} 200 Z`;
  const linePath = `M ${chartPoints[0]?.x ?? 0} ${chartPoints[0]?.y ?? 0} ` +
    chartPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

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
            amount: Number(invoiceData.amount) || 0,
            description: invoiceData.description || null,
            status: invoiceData.status || 'pending',
            due_date: invoiceData.due_date || null,
            client_id: invoiceData.client_id || null,
          })
          .eq('id', selectedInvoice.id);
        if (updateError) throw updateError;
        toastSuccess('Invoice updated.');
      } else {
        const insertPayload: any = {
          amount: Number(invoiceData.amount) || 0,
          description: invoiceData.description || null,
          status: invoiceData.status || 'pending',
          due_date: invoiceData.due_date || null,
          client_id: invoiceData.client_id || null,
          currency: 'USD',
        };
        const { error: insertError } = await supabase.from('invoices').insert(insertPayload);
        if (insertError) throw insertError;
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
    toastSuccess(`Payment reminder queued for ${invoice.client} ($${invoice.amount.toLocaleString()}).`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3aa3eb]"></div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unpaid') return inv.status === 'pending' || inv.status === 'unpaid' || inv.status === 'ready';
    return inv.status === filterStatus;
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
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-200">{loadError}</p>
          </div>
        </div>
      )}

      {/* Main Charts & Revenue Snapshot Section */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3aa3eb]/5 to-transparent opacity-50 pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 relative z-10 gap-4">
              <h2 className="text-lg font-bold text-white tracking-widest uppercase" style={{ fontFamily: 'Integral CF, Montserrat, sans-serif' }}>{periodTitleMap[chartPeriod]}</h2>
              <div className="flex flex-wrap gap-2">
                {(['day', 'week', 'month', 'quarter', 'year'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all border ${chartPeriod === period
                      ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full relative group/chart">
              <svg viewBox="0 0 800 200" className="w-full h-full drop-shadow-[0_0_15px_rgba(58,163,235,0.3)]">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3aa3eb" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3aa3eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map(i => (
                  <line key={i} x1="0" y1={i * 50 + 20} x2="800" y2={i * 50 + 20} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                ))}
                <path d={linePath} fill="none" stroke="#3aa3eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-[draw_2s_ease-out]" />
                <path d={areaPath} fill="url(#chartGradient)" />
                {chartData.map((d, i) => {
                  const hitboxWidth = 800 / chartPointsCount;
                  return (
                    <rect
                      key={`hitbox-${i}`}
                      x={d.x - hitboxWidth / 2}
                      y="0"
                      width={hitboxWidth}
                      height="200"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredMonthIndex(i)}
                      onMouseLeave={() => setHoveredMonthIndex(null)}
                    />
                  );
                })}
                {chartPoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredMonthIndex === i ? '6' : '4'}
                    fill={hoveredMonthIndex === i ? '#ffffff' : '#3aa3eb'}
                    stroke="#ffffff"
                    strokeWidth={hoveredMonthIndex === i ? '3' : '2'}
                    className="transition-all duration-300"
                  />
                ))}
              </svg>

              {hoveredMonthIndex !== null && (
                <div
                  className="absolute z-50 pointer-events-none transition-all duration-300"
                  style={{
                    left: `${(chartPoints[hoveredMonthIndex].x / 800) * 100}%`,
                    top: `${(chartPoints[hoveredMonthIndex].y / 200) * 100}%`,
                    marginTop: '-45px',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="bg-[#0f172a] border border-[#3aa3eb]/30 rounded-xl px-4 py-2 shadow-[0_0_20px_rgba(58,163,235,0.2)] flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-black text-[#3aa3eb] uppercase tracking-widest">
                      {chartData[hoveredMonthIndex].label} Revenue
                    </span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      ${chartData[hoveredMonthIndex].value.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-2 h-2 bg-[#0f172a] border-r border-b border-[#3aa3eb]/30 rotate-45 mx-auto -mt-1" />
                </div>
              )}

              <div className="flex justify-between text-[10px] font-bold uppercase mt-4 px-12">
                {chartData.map((d, i) => (
                  <span
                    key={i}
                    className={`transition-colors duration-300 ${hoveredMonthIndex === i ? 'text-white' : 'text-gray-500'}`}
                  >
                    {d.label}
                  </span>
                ))}
              </div>

              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-500 font-bold pr-2">
                <span>${Math.round(maxVal / 1000)}k</span>
                <span>${Math.round((maxVal * 0.66) / 1000)}k</span>
                <span>${Math.round((maxVal * 0.33) / 1000)}k</span>
                <span>$0</span>
              </div>
            </div>
          </div>

          {/* Revenue Snapshot */}
          <div className="glass-card rounded-3xl p-8 flex flex-col justify-between bg-gradient-to-b from-white/5 to-transparent">
            <h2 className="text-lg font-bold text-white tracking-widest uppercase mb-6" style={{ fontFamily: 'Integral CF, Montserrat, sans-serif' }}>REVENUE SNAPSHOT</h2>
            <div className="space-y-4">
              {[
                { label: 'Last 7 Days', value: `$${revenue7d.toLocaleString()}` },
                { label: 'Last 30 Days', value: `$${revenue30d.toLocaleString()}` },
                { label: 'This Quarter', value: `$${revenueQuarter.toLocaleString()}` },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <span className="text-sm text-gray-300 font-medium">{item.label}</span>
                  <span className="text-xl font-black text-white" style={{ fontFamily: 'Integral CF, Montserrat, sans-serif' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mini Stats Cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Invoices Sent · 30d', value: invoices.length, icon: EyeIcon, iconBg: 'bg-[#3aa3eb]/20' },
            { label: 'Total Cash Collected', value: `$${totalPaid.toLocaleString()}`, icon: CheckCircleIcon, iconBg: 'bg-green-500/20' },
            { label: 'Overdue Funds', value: `$${totalOverdue.toLocaleString()}`, icon: ExclamationTriangleIcon, iconBg: 'bg-red-500/20' },
            { label: 'Total Outstanding', value: `$${totalOutstanding.toLocaleString()}`, icon: CreditCardIcon, iconBg: 'bg-blue-500/20' },
          ].map((stat, idx) => (
            <div key={idx} className="glass-card rounded-xl p-6 flex items-center gap-4 transition-all duration-300 hover-glow border border-white/10">
              <div className={`p-3 rounded-lg ${stat.iconBg}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-white font-medium mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Cards — iOS Style */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
            {[
              { id: 'all', label: 'All', count: invoices.length },
              { id: 'unpaid', label: 'Unpaid', count: invoices.filter(i => i.status !== 'paid').length },
              { id: 'overdue', label: 'Overdue', count: invoices.filter(i => i.status === 'overdue').length },
              { id: 'paid', label: 'Paid', count: invoices.filter(i => i.status === 'paid').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterStatus === tab.id
                  ? 'bg-[#3aa3eb] text-white shadow-[0_0_15px_rgba(58,163,235,0.4)]'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                {tab.label} <span className="opacity-50 ml-1">({tab.count})</span>
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-2 group transition-all"
          >
            Export CSV
            <ArrowDownTrayIcon className="h-4 w-4 group-hover:translate-y-[1px] transition-transform" />
          </button>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center border border-white/10">
            <DocumentIcon className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-500">No invoices found</h3>
            <p className="text-gray-600 text-sm mt-1">
              {invoices.length === 0
                ? 'No invoices have been created yet. Click "New Invoice" to get started.'
                : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredInvoices.map((invoice) => {
              const isPaid = invoice.status === 'paid';
              const isOverdue = invoice.status === 'overdue';
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
                  {/* Status accent bar */}
                  <div className={`h-1 w-full ${style.dot}`} />

                  <div className="p-5 space-y-4">
                    {/* Top: Invoice number + status pill */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-1 h-8 rounded-full ${style.dot}`} />
                        <span className="text-sm font-black text-white tracking-widest" style={{ fontFamily: 'Integral CF, Montserrat, sans-serif' }}>
                          {invoice.number}
                        </span>
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
                      <div>
                        <p className="text-sm font-bold text-gray-200">{invoice.client}</p>
                        <p className={`text-xs font-medium mt-1 ${dueColor}`}>{dueDisplay}</p>
                      </div>
                      <span className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'Integral CF, Montserrat, sans-serif' }}>
                        ${invoice.amount.toLocaleString()}
                      </span>
                    </div>

                    {/* Bottom: Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <button
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#3aa3eb] hover:text-white transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
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
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          )}
                        </button>
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => handleSendReminder(invoice)}
                              className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-[#3aa3eb] hover:bg-[#3aa3eb]/10 transition-all"
                              title="Send Reminder"
                            >
                              <EnvelopeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditInvoice(invoice)}
                              className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        ) : (invoice.status === 'pending' || invoice.status === 'overdue') ? (
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
            ? `Are you sure you want to delete the invoice for "${selectedInvoice.client}" ($${selectedInvoice.amount.toLocaleString()})?`
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
