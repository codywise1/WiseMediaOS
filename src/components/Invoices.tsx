import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, Invoice as InvoiceRecord, UserRole } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import {
  DocumentIcon,
  CreditCardIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  EnvelopeIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../contexts/ToastContext';
import InvoiceModal from './InvoiceModal';
import ConfirmDialog from './ConfirmDialog';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import PaymentModal from './PaymentModal';

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface InvoicesProps {
  currentUser: User | null;
}

type InvoiceView = Omit<InvoiceRecord, 'client'> & {
  createdDate: string;
  dueDate: string;
  client: string;
  clientRecord?: InvoiceRecord['client'];
};



export default function Invoices({ currentUser }: InvoicesProps) {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceView | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'overdue' | 'paid'>('all');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [currentUser?.id, currentUser?.role]);

  const loadInvoices = async () => {
    try {
      if (invoices.length === 0) {
        setLoading(true);
      }
      let data: InvoiceRecord[] = [];

      if (currentUser?.role === 'admin') {
        data = await invoiceService.getAll();
      } else if (currentUser) {
        data = await invoiceService.getForCurrentUser();
      }

      const transformedInvoices: InvoiceView[] = data.map(invoice => ({
        ...invoice,
        clientRecord: invoice.client,
        client: invoice.client?.name || 'Unknown Client',
        createdDate: invoice.created_at || '',
        dueDate: invoice.due_date || ''
      }));

      setInvoices(transformedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toastError('Error loading invoices.');
    } finally {
      setLoading(false);
    }
  };

  const totalPending = invoices.filter(inv => inv.status === 'pending' || inv.status === 'unpaid' || inv.status === 'ready').reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const totalOutstanding = totalPending + totalOverdue;

  // Real Data Calculations
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const currentQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

  const revenue7d = invoices
    .filter(inv => inv.status === 'paid' && new Date(inv.updated_at || inv.created_at) >= sevenDaysAgo)
    .reduce((sum, inv) => sum + inv.amount, 0);

  const revenue30d = invoices
    .filter(inv => inv.status === 'paid' && new Date(inv.updated_at || inv.created_at) >= thirtyDaysAgo)
    .reduce((sum, inv) => sum + inv.amount, 0);

  const revenueQuarter = invoices
    .filter(inv => inv.status === 'paid' && new Date(inv.updated_at || inv.created_at) >= currentQuarterStart)
    .reduce((sum, inv) => sum + inv.amount, 0);

  // Chart Data: Last 8 months (Desktop) or 3 months (Mobile)
  const chartPointsCount = isMobile ? 3 : 8;
  const chartData = Array.from({ length: chartPointsCount }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (chartPointsCount - 1 - i), 1);
    const monthRevenue = invoices
      .filter(inv => {
        const invDate = new Date(inv.updated_at || inv.created_at);
        return inv.status === 'paid' &&
          invDate.getMonth() === d.getMonth() &&
          invDate.getFullYear() === d.getFullYear();
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Distribute points evenly across the 800px width
    const spacing = 800 / (chartPointsCount + 1);
    return {
      label: d.toLocaleDateString('default', { month: 'short' }),
      value: monthRevenue,
      x: spacing * (i + 1),
    };
  });

  const maxVal = Math.max(...chartData.map(d => d.value), 1000);
  const chartPoints = chartData.map(d => ({
    x: d.x,
    y: 180 - (d.value / maxVal) * 150
  }));

  const areaPath = `M ${chartPoints[0].x} 200 ` +
    chartPoints.map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${chartPoints[chartPoints.length - 1].x} 200 Z`;

  const linePath = `M ${chartPoints[0].x} ${chartPoints[0].y} ` +
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

  const handleSaveInvoice = (invoiceData: any) => {
    const saveInvoice = async () => {
      try {
        const payload = {
          client_id: invoiceData.client_id,
          amount: invoiceData.amount,
          description: invoiceData.description,
          status: invoiceData.status,
          due_date: invoiceData.dueDate
        };

        if (modalMode === 'create') {
          await invoiceService.create(payload);
          toastSuccess('Invoice created successfully.');
        } else if (selectedInvoice) {
          await invoiceService.update(selectedInvoice.id, payload as any);
          toastSuccess('Invoice updated successfully.');
        }
        await loadInvoices();
      } catch (error) {
        console.error('Error saving invoice:', error);
        toastError('Error saving invoice.');
      }
    };
    saveInvoice();
  };

  const confirmDelete = async () => {
    if (selectedInvoice) {
      try {
        await invoiceService.delete(selectedInvoice.id);
        await loadInvoices();
        setIsDeleteDialogOpen(false);
        setSelectedInvoice(undefined);
      } catch (error) {
        toastError('Error deleting invoice.');
      }
    }
  };

  const handlePayInvoice = (invoice: InvoiceView) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async (_paymentDetails: any) => {
    try {
      await loadInvoices();
    } catch (error) {
      console.error('Error refreshing invoices:', error);
    }
  };

  const [generatingPDFId, setGeneratingPDFId] = useState<string | null>(null);

  const handleDownloadPDF = async (invoice: InvoiceView) => {
    try {
      setGeneratingPDFId(invoice.id);
      await new Promise(resolve => setTimeout(resolve, 800));
      await generateInvoicePDF({
        ...invoice,
        client: invoice.client,
        createdDate: invoice.created_at,
        dueDate: invoice.due_date
      } as any);
    } finally {
      setGeneratingPDFId(null);
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
  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unpaid') return inv.status === 'pending' || inv.status === 'unpaid' || inv.status === 'ready';
    return inv.status === filterStatus;
  });

  const exportCSV = () => {
    const headers = ['Invoice', 'Client', 'Status', 'Amount', 'Due Date'];
    const rows = filteredInvoices.map(inv => [
      inv.id.slice(0, 8),
      inv.client,
      inv.status,
      inv.amount.toString(),
      inv.dueDate || 'N/A'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_${new Date().toISOString().split('T')[0]}.csv`);
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
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>Invoices</h1>
            <p className="text-gray-300">Manage payments and track outstanding balances</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleNewInvoice}
              className="btn-primary text-white font-medium flex items-center space-x-2 shrink-glow-button shrink-0 w-full sm:w-auto"
            >
              <PlusIcon className="h-5 w-5" />
              <span>New Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Charts & Revenue Snapshot Section */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quarterly Earnings Chart */}
          <div className="lg:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3aa3eb]/5 to-transparent opacity-50 pointer-events-none" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="text-lg font-bold text-white tracking-widest uppercase" style={{ fontFamily: 'Integral CF, Montserrat, sans-serif' }}>MONTHLY EARNINGS</h2>
            </div>

            <div className="h-64 w-full relative group/chart">
              {/* Simple SVG Chart */}
              <svg viewBox="0 0 800 200" className="w-full h-full drop-shadow-[0_0_15px_rgba(58,163,235,0.3)]">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3aa3eb" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3aa3eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                {[0, 1, 2, 3].map(i => (
                  <line key={i} x1="0" y1={i * 50 + 20} x2="800" y2={i * 50 + 20} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                ))}

                {/* Chart Line Path */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="#3aa3eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-[draw_2s_ease-out]"
                />
                <path
                  d={areaPath}
                  fill="url(#chartGradient)"
                />
                {/* Interactive Hover Zones */}
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

                {/* Points */}
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

              {/* Enhanced Tooltip */}
              {hoveredMonthIndex !== null && (
                <div
                  className="absolute z-50 pointer-events-none transition-all duration-300"
                  style={{
                    left: `${(chartPoints[hoveredMonthIndex].x / 800) * 100}%`,
                    top: `${(chartPoints[hoveredMonthIndex].y / 200) * 100}%`,
                    marginTop: '-45px',
                    transform: 'translateX(-50%)'
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
                  {/* Tooltip arrow */}
                  <div className="w-2 h-2 bg-[#0f172a] border-r border-b border-[#3aa3eb]/30 rotate-45 mx-auto -mt-1" />
                </div>
              )}

              {/* Axis Labels */}
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

              {/* Y-Axis Labels */}
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
                { label: 'This Quarter', value: `$${revenueQuarter.toLocaleString()}` }
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
            { label: 'Invoices Sent · 30d', value: invoices.length, icon: EyeIcon, color: 'text-white', iconBg: 'bg-[#3aa3eb]/20' },
            { label: 'Total Cash Collected', value: `$${totalPaid.toLocaleString()}`, icon: CheckCircleIcon, color: 'text-white', iconBg: 'bg-green-500/20' },
            { label: 'Overdue Funds', value: `$${totalOverdue.toLocaleString()}`, icon: ExclamationTriangleIcon, color: 'text-white', iconBg: 'bg-red-500/20' },
            { label: 'Total Outstanding', value: `$${totalOutstanding.toLocaleString()}`, icon: CreditCardIcon, color: 'text-white', iconBg: 'bg-blue-500/20' }
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

      {/* Filter Tabs and Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
            {[
              { id: 'all', label: 'All', count: invoices.length },
              { id: 'unpaid', label: 'Unpaid', count: invoices.filter(i => i.status !== 'paid').length },
              { id: 'overdue', label: 'Overdue', count: invoices.filter(i => i.status === 'overdue').length },
              { id: 'paid', label: 'Paid', count: invoices.filter(i => i.status === 'paid').length }
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

        {/* Invoice Table Container */}
        <div className="glass-card rounded-3xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                  <th className="px-8 py-5 text-xs font-bold tracking-tight">Invoice</th>
                  <th className="px-6 py-5 text-xs font-bold tracking-tight">Client</th>
                  <th className="px-6 py-5 text-xs font-bold tracking-tight">Status</th>
                  <th className="px-6 py-5 text-xs font-bold tracking-tight">Amount</th>
                  <th className="px-6 py-5 text-xs font-bold tracking-tight">Due</th>
                  <th className="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-1 h-8 rounded-full ${invoice.status === 'overdue' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                          invoice.status === 'paid' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                            'bg-[#3aa3eb] shadow-[0_0_10px_rgba(58,163,235,0.5)]'
                          }`} />
                        <span className="text-sm font-black text-white tracking-widest" style={{ fontFamily: 'Integral CF, Montserrat, sans-serif' }}>
                          INV-{invoice.id.slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-sm font-bold text-gray-200">{invoice.client}</span>
                    </td>
                    <td className="px-6 py-6 transition-all">
                      {(() => {
                        const statusStyles: Record<string, { bg: string, border: string, text: string }> = {
                          paid: { bg: 'rgba(34, 197, 94, 0.33)', border: 'rgba(34, 197, 94, 1)', text: '#ffffff' },
                          overdue: { bg: 'rgba(239, 68, 68, 0.33)', border: 'rgba(239, 68, 68, 1)', text: '#ffffff' },
                          pending: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff' },
                          unpaid: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff' },
                          ready: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff' },
                          default: { bg: 'rgba(148, 163, 184, 0.33)', border: 'rgba(148, 163, 184, 1)', text: '#ffffff' }
                        };

                        const style = statusStyles[invoice.status.toLowerCase()] || statusStyles.default;

                        return (
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all"
                            style={{
                              backgroundColor: style.bg,
                              border: `1px solid ${style.border}`,
                              color: style.text
                            }}
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-lg font-black text-white" style={{ fontFamily: 'Integral CF, Montserrat, sans-serif' }}>
                        ${invoice.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-300">
                          {invoice.status === 'paid' ? (
                            `Paid on ${formatAppDate(invoice.updated_at || invoice.created_at || '')}`
                          ) : invoice.status === 'overdue' ? (
                            (() => {
                              const diff = Math.floor((new Date().getTime() - new Date(invoice.dueDate || '').getTime()) / (1000 * 3600 * 24));
                              return `${diff > 0 ? diff : 1} ${diff === 1 ? 'Day' : 'Days'} Overdue`;
                            })()
                          ) : (
                            (() => {
                              const diff = Math.floor((new Date(invoice.dueDate || '').getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                              return `Due in ${diff > 0 ? diff : 0} ${diff === 1 ? 'Day' : 'Days'}`;
                            })()
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
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
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                toastSuccess(
                                  `Payment reminder queued for ${invoice.client} ($${invoice.amount.toLocaleString()} · Due ${invoice.dueDate}).`
                                );
                              }}
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
                        )}
                        {!isAdmin && (invoice.status === 'pending' || invoice.status === 'overdue') && (
                          <button
                            onClick={() => handlePayInvoice(invoice)}
                            className="px-4 py-2 rounded-xl bg-[#3aa3eb] text-white text-[10px] font-black tracking-widest hover:scale-105 transition-all shadow-[0_0_15px_rgba(58,163,235,0.4)]"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredInvoices.length === 0 && (
              <div className="p-12 text-center">
                <DocumentIcon className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-500">No invoices found</h3>
                <p className="text-gray-600 text-sm mt-1">Try adjusting your filters or creating a new invoice</p>
              </div>
            )}
          </div>
        </div>
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