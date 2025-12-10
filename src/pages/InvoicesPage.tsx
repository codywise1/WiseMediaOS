import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { formatAppDate } from '../lib/dateFormat';
import { FileText, Plus, X, DollarSign, Calendar, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Invoice {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
  admin_id: string | null;
  client_id: string | null;
}

export default function InvoicesPage() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ amount: '', due_date: '', status: 'pending' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [profile]);

  async function fetchInvoices() {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .or(`admin_id.eq.${profile.id},client_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile || !formData.amount || !formData.due_date) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('invoices').insert({
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        status: formData.status,
        admin_id: profile.id,
      });

      if (!error) {
        setShowModal(false);
        setFormData({ amount: '', due_date: '', status: 'pending' });
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'overdue': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices.filter(i => i.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-white font-bold text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Invoices
          </h1>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
            <Plus size={20} />
            New Invoice
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <DollarSign className="text-green-400" size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Total Revenue</p>
                <p className="text-white font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '28px' }}>\${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Calendar className="text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pending</p>
                <p className="text-white font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '28px' }}>\${pendingAmount.toFixed(2)}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <FileText className="text-red-400" size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Overdue</p>
                <p className="text-white font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '28px' }}>\${overdueAmount.toFixed(2)}</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          {loading ? (
            <GlassCard>
              <p className="text-gray-400 text-center py-8" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Loading invoices...</p>
            </GlassCard>
          ) : invoices.length === 0 ? (
            <GlassCard>
              <p className="text-gray-400 text-center py-8" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>No invoices yet. Click "New Invoice" to create one.</p>
            </GlassCard>
          ) : (
            invoices.map((invoice) => (
              <GlassCard key={invoice.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#3AA3EB]/20 rounded-lg">
                      <FileText className="text-[#3AA3EB]" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>${invoice.amount.toFixed(2)}</h3>
                      <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                        Due: {formatAppDate(invoice.due_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(invoice.status)}`} style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                    <button className="px-4 py-2 bg-[#3AA3EB]/20 hover:bg-[#3AA3EB]/30 text-[#3AA3EB] rounded-lg transition-colors text-sm font-medium flex items-center gap-2">
                      <Send size={16} />
                      Send
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Invoice</h3>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>\$</span>
                      <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }} placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Due Date</label>
                    <input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }} />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={handleSave} disabled={saving || !formData.amount || !formData.due_date} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg transition-colors font-medium" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      {saving ? 'Creating...' : 'Create Invoice'}
                    </button>
                    <button onClick={() => setShowModal(false)} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Cancel</button>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </>
      )}
    </>
  );
}
