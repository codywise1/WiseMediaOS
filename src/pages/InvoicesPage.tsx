import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { formatAppDate, formatToISODate } from '../lib/dateFormat';
import {
  Plus, X, Calendar, ArrowRight, FileText, TrendingUp, Clock,
  AlertCircle, CheckCircle2, ChevronRight, Download, Ban,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Invoice {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  issued_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  admin_id: string | null;
  client_id: string | null;
  description?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  paid: { label: 'Paid', dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  pending: { label: 'Pending', dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  overdue: { label: 'Overdue', dot: 'bg-rose-400', text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  draft: { label: 'Draft', dot: 'bg-slate-400', text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  void: { label: 'Void', dot: 'bg-slate-600', text: 'text-slate-500', bg: 'bg-slate-700/15', border: 'border-slate-600/30' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: typeof TrendingUp; accent: string;
}) {
  return (
    <div className="ios-card rounded-3xl p-6 border border-white/10">
      <div className="flex items-start justify-between mb-5">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${accent}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{label}</p>
      <p className="text-white font-bold text-3xl tabular-nums font-display leading-none">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-2">{sub}</p>}
    </div>
  );
}

function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-32 px-1">
      {data.map((d, i) => {
        const heightPct = (d.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-[#3AA3EB]/40 to-[#3AA3EB] transition-all duration-500 ease-out group-hover:from-[#3AA3EB]/60 group-hover:to-[#5ab4fb] relative"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-semibold text-white tabular-nums whitespace-nowrap">
                    ${d.value.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ amount: '', due_date: '', issued_date: '', status: 'pending' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchInvoices(); }, [profile]);

  async function fetchInvoices() {
    if (!profile || !supabase) { setInvoices([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (e) { console.error('Error fetching invoices:', e); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!profile || !formData.amount || !formData.due_date || !supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('invoices').insert({
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        issued_at: formData.issued_date || null,
        status: formData.status,
        admin_id: profile.id,
      });
      if (!error) {
        setShowModal(false);
        setFormData({ amount: '', due_date: '', issued_date: '', status: 'pending' });
        fetchInvoices();
      }
    } catch (e) { console.error(e); alert('Failed to create invoice'); }
    finally { setSaving(false); }
  }

  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid');
    const pending = invoices.filter(i => i.status === 'pending');
    const overdue = invoices.filter(i => i.status === 'overdue');
    return {
      totalRevenue: paid.reduce((s, i) => s + i.amount, 0),
      pendingAmount: pending.reduce((s, i) => s + i.amount, 0),
      overdueAmount: overdue.reduce((s, i) => s + i.amount, 0),
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
    };
  }, [invoices]);

  const chartData = useMemo(() => {
    const months: { label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });
      const value = invoices
        .filter(inv => {
          const dt = new Date(inv.created_at);
          return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear() && inv.status === 'paid';
        })
        .reduce((s, i) => s + i.amount, 0);
      months.push({ label, value });
    }
    return months;
  }, [invoices]);

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Invoices"
          subtitle="Track billing, payments, and outstanding balances."
          action={
            <button onClick={() => setShowModal(true)} className="btn-header-glass space-x-2 w-full sm:w-auto">
              <Plus size={18} className="text-[#3AA3EB]" />
              <span className="btn-text-glow">New Invoice</span>
            </button>
          }
        />

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            label="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub={`${stats.paidCount} paid invoice${stats.paidCount === 1 ? '' : 's'}`}
            icon={TrendingUp}
            accent="bg-emerald-500/15 text-emerald-300"
          />
          <StatCard
            label="Pending"
            value={`$${stats.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub={`${stats.pendingCount} awaiting payment`}
            icon={Clock}
            accent="bg-amber-500/15 text-amber-300"
          />
          <StatCard
            label="Overdue"
            value={`$${stats.overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub={`${stats.overdueCount} need attention`}
            icon={AlertCircle}
            accent="bg-rose-500/15 text-rose-300"
          />
        </div>

        {/* Revenue chart card */}
        <div className="ios-card rounded-3xl p-6 sm:p-8 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-bold text-base" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>
                Revenue
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">Last 6 months · paid invoices</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp size={12} className="text-emerald-400" />
              <span className="text-emerald-300 text-xs font-semibold">Paid</span>
            </div>
          </div>
          <MiniBarChart data={chartData} />
        </div>

        {/* Invoices list */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-white font-bold text-base" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>
              All Invoices
            </h2>
            <span className="text-gray-500 text-xs">{invoices.length} total</span>
          </div>

          {loading ? (
            <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
              <div className="inline-block w-6 h-6 border-2 border-white/20 border-t-[#3AA3EB] rounded-full animate-spin" />
              <p className="text-gray-500 text-sm mt-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-gray-600" />
              </div>
              <p className="text-white font-semibold text-sm mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>No invoices yet</p>
              <p className="text-gray-500 text-xs">Create your first invoice to start tracking payments.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {invoices.map((invoice) => {
                const due = new Date(invoice.due_date);
                const today = new Date();
                const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = invoice.status !== 'paid' && invoice.status !== 'void' && daysUntilDue < 0;

                return (
                  <button
                    key={invoice.id}
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                    className="ios-card w-full rounded-3xl p-5 sm:p-6 border border-white/10 text-left transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/20 active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-4 sm:gap-5">
                      {/* Left: status icon */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        invoice.status === 'paid' ? 'bg-emerald-500/15' :
                        invoice.status === 'void' ? 'bg-slate-700/30' :
                        invoice.status === 'overdue' || isOverdue ? 'bg-rose-500/15' :
                        'bg-amber-500/15'
                      }`}>
                        {invoice.status === 'paid' ? <CheckCircle2 size={20} className="text-emerald-400" /> :
                         invoice.status === 'void' ? <Ban size={20} className="text-slate-500" /> :
                         isOverdue ? <AlertCircle size={20} className="text-rose-400" /> :
                         <Clock size={20} className="text-amber-400" />}
                      </div>

                      {/* Middle: content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <p className="text-white font-semibold text-[15px] truncate" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>
                            {invoice.description || 'Invoice'}
                          </p>
                          <StatusPill status={invoice.status} />
                        </div>
                        <div className="flex items-center gap-3 text-gray-500 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            Due {formatAppDate(invoice.due_date)}
                          </span>
                          {invoice.status !== 'paid' && (
                            <span className={isOverdue ? 'text-rose-400' : 'text-gray-500'}>
                              {isOverdue
                                ? `${Math.abs(daysUntilDue)}d overdue`
                                : `${daysUntilDue}d remaining`}
                            </span>
                          )}
                          {invoice.status === 'paid' && invoice.paid_at && (
                            <span className="text-emerald-400">Paid {formatAppDate(invoice.paid_at)}</span>
                          )}
                        </div>
                      </div>

                      {/* Right: amount + chevron */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-white font-bold text-lg tabular-nums font-display leading-none">
                            ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-gray-600 text-[10px] mt-1 uppercase tracking-wider">
                            INV-{invoice.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-gray-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
              <div className="ios-card rounded-3xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h3 className="text-white font-bold text-lg font-display">New Invoice</h3>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-display">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full pl-9 pr-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all font-display text-lg"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Date Issued</label>
                    <DatePicker
                      selected={formData.issued_date ? new Date(formData.issued_date + 'T00:00:00') : null}
                      onChange={(date: Date | null) => setFormData({ ...formData, issued_date: date ? formatToISODate(date) : '' })}
                      dateFormat="MMM. dd, yyyy"
                      placeholderText="Dec. 10, 2025"
                      isClearable
                      className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Due Date</label>
                    <DatePicker
                      selected={formData.due_date ? new Date(formData.due_date) : null}
                      onChange={(date: Date | null) => setFormData({ ...formData, due_date: date ? formatToISODate(date) : '' })}
                      dateFormat="MMM. dd, yyyy"
                      placeholderText="Dec. 10, 2025"
                      className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 p-6 border-t border-white/10">
                  <button onClick={handleSave} disabled={saving || !formData.amount || !formData.due_date} className="flex-1 py-3.5 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/40 text-white rounded-2xl transition-all font-semibold flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight size={18} />}
                    {saving ? 'Creating...' : 'Create Invoice'}
                  </button>
                  <button onClick={() => setShowModal(false)} className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl transition-colors font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
