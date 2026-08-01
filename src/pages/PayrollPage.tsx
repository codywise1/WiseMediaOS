import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import {
  Users, Calendar, Clock, DollarSign, Plus, X, Check,
  Sparkles, Wallet, TrendingUp, ChevronRight, Mail, Phone,
} from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';

interface Cleaner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  pay_type: 'hourly' | 'flat_rate';
  hourly_rate: number;
  flat_rate_per_clean: number;
  status: 'active' | 'inactive';
}

interface CleanRecord {
  id: string;
  cleaner_id: string;
  clean_date: string;
  hours_worked: number | null;
  property_name: string | null;
  notes: string | null;
  pay_amount: number;
  status: 'pending' | 'paid';
  created_at: string;
}

type PayrollTab = 'payroll' | 'cleans' | 'team';

export default function PayrollPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<PayrollTab>('payroll');
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [cleanRecords, setCleanRecords] = useState<CleanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClean, setShowAddClean] = useState(false);
  const [showAddCleaner, setShowAddCleaner] = useState(false);

  const [newClean, setNewClean] = useState({
    cleaner_id: '',
    clean_date: format(new Date(), 'yyyy-MM-dd'),
    hours_worked: '',
    property_name: '',
    notes: '',
  });

  const [newCleaner, setNewCleaner] = useState({
    name: '',
    email: '',
    phone: '',
    pay_type: 'hourly' as 'hourly' | 'flat_rate',
    hourly_rate: '',
    flat_rate_per_clean: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cleanersRes, cleansRes] = await Promise.all([
        supabase.from('cleaners').select('*').order('name'),
        supabase.from('clean_records').select('*').order('clean_date', { ascending: false }),
      ]);
      setCleaners(cleanersRes.data || []);
      setCleanRecords(cleansRes.data || []);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cleanerName = (id: string) => cleaners.find(c => c.id === id)?.name || 'Unknown';
  const cleanerById = (id: string) => cleaners.find(c => c.id === id);

  function getPayrollCards() {
    return cleaners.map(cleaner => {
      const records = cleanRecords.filter(r => r.cleaner_id === cleaner.id);
      const pendingRecords = records.filter(r => r.status === 'pending');
      const totalPay = pendingRecords.reduce((sum, r) => sum + Number(r.pay_amount), 0);
      const totalHours = pendingRecords.reduce((sum, r) => sum + Number(r.hours_worked || 0), 0);
      const totalCleans = pendingRecords.length;
      return { cleaner, records: pendingRecords, totalPay, totalHours, totalCleans };
    });
  }

  const payrollCards = getPayrollCards();
  const totalPendingPay = payrollCards.reduce((sum, p) => sum + p.totalPay, 0);
  const totalCleansPending = payrollCards.reduce((sum, p) => sum + p.totalCleans, 0);

  async function handleAddClean() {
    if (!newClean.cleaner_id || !newClean.clean_date) return;
    const cleaner = cleanerById(newClean.cleaner_id);
    if (!cleaner) return;

    const hours = newClean.hours_worked ? parseFloat(newClean.hours_worked) : null;
    let payAmount = 0;
    if (cleaner.pay_type === 'flat_rate') {
      payAmount = Number(cleaner.flat_rate_per_clean);
    } else if (hours) {
      payAmount = hours * Number(cleaner.hourly_rate);
    }

    try {
      await supabase.from('clean_records').insert({
        cleaner_id: newClean.cleaner_id,
        clean_date: newClean.clean_date,
        hours_worked: hours,
        property_name: newClean.property_name || null,
        notes: newClean.notes || null,
        pay_amount: payAmount,
        status: 'pending',
      });
      setShowAddClean(false);
      setNewClean({ cleaner_id: '', clean_date: format(new Date(), 'yyyy-MM-dd'), hours_worked: '', property_name: '', notes: '' });
      fetchData();
    } catch (err) {
      console.error('Error adding clean:', err);
      alert('Failed to add clean record');
    }
  }

  async function handleAddCleaner() {
    if (!newCleaner.name) return;
    try {
      await supabase.from('cleaners').insert({
        name: newCleaner.name,
        email: newCleaner.email || null,
        phone: newCleaner.phone || null,
        pay_type: newCleaner.pay_type,
        hourly_rate: newCleaner.pay_type === 'hourly' ? parseFloat(newCleaner.hourly_rate) || 0 : 0,
        flat_rate_per_clean: newCleaner.pay_type === 'flat_rate' ? parseFloat(newCleaner.flat_rate_per_clean) || 0 : 0,
        status: 'active',
      });
      setShowAddCleaner(false);
      setNewCleaner({ name: '', email: '', phone: '', pay_type: 'hourly', hourly_rate: '', flat_rate_per_clean: '' });
      fetchData();
    } catch (err) {
      console.error('Error adding cleaner:', err);
      alert('Failed to add cleaner');
    }
  }

  async function markCleanPaid(cleanId: string) {
    try {
      await supabase.from('clean_records').update({ status: 'paid' }).eq('id', cleanId);
      fetchData();
    } catch (err) {
      console.error('Error marking clean as paid:', err);
    }
  }

  async function markAllPaid(cleanerId: string) {
    const pending = cleanRecords.filter(r => r.cleaner_id === cleanerId && r.status === 'pending');
    for (const rec of pending) {
      await supabase.from('clean_records').update({ status: 'paid' }).eq('id', rec.id);
    }
    fetchData();
  }

  async function toggleCleanerStatus(cleaner: Cleaner) {
    try {
      await supabase.from('cleaners')
        .update({ status: cleaner.status === 'active' ? 'inactive' : 'active' })
        .eq('id', cleaner.id);
      fetchData();
    } catch (err) {
      console.error('Error updating cleaner:', err);
    }
  }

  const tabs: { id: PayrollTab; label: string; icon: typeof Wallet }[] = [
    { id: 'payroll', label: 'Payroll', icon: Wallet },
    { id: 'cleans', label: 'Clean Records', icon: Calendar },
    { id: 'team', label: 'Team', icon: Users },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Payroll"
        subtitle="Track cleans by date of clean, manage team pay, and process payroll."
        action={
          <div className="flex gap-2">
            {activeTab === 'cleans' && (
              <button
                onClick={() => setShowAddClean(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl transition-colors font-medium text-sm font-body"
              >
                <Plus size={18} /> Add Clean
              </button>
            )}
            {activeTab === 'team' && (
              <button
                onClick={() => setShowAddCleaner(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl transition-colors font-medium text-sm font-body"
              >
                <Plus size={18} /> Add Cleaner
              </button>
            )}
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="ios-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#3AA3EB]/15">
              <Wallet className="text-[#3AA3EB]" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-xs font-body truncate">Pending Pay</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">${totalPendingPay.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="ios-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/15">
              <TrendingUp className="text-green-400" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-xs font-body truncate">Pending Cleans</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">{totalCleansPending}</p>
            </div>
          </div>
        </div>
        <div className="ios-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15">
              <Users className="text-purple-400" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-xs font-body truncate">Active Team</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">{cleaners.filter(c => c.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="ios-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/15">
              <Clock className="text-orange-400" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-xs font-body truncate">Total Hours</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">{payrollCards.reduce((s, p) => s + p.totalHours, 0).toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Segmented Control */}
      <div className="ios-segmented">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`ios-segmented-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon className="h-4 w-4 inline -mt-0.5 mr-1.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="ios-card rounded-2xl p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3AA3EB] mx-auto mb-3" />
          <p className="text-gray-400 font-body text-sm">Loading payroll data...</p>
        </div>
      )}

      {/* PAYROLL TAB - Cards per cleaner synced to clean_date */}
      {!loading && activeTab === 'payroll' && (
        <div className="space-y-4">
          {payrollCards.length === 0 ? (
            <div className="ios-card rounded-2xl p-12 text-center">
              <Wallet className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 font-display uppercase tracking-wide">No payroll data</h3>
              <p className="text-gray-400 font-body text-sm">Add cleaners and clean records to generate payroll cards.</p>
            </div>
          ) : (
            payrollCards.map(({ cleaner, records, totalPay, totalHours, totalCleans }) => (
              <div key={cleaner.id} className="ios-card rounded-2xl overflow-hidden">
                {/* Card Header */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 font-display text-white text-base ${cleaner.status === 'active' ? 'bg-gradient-to-br from-[#3AA3EB] to-[#2a92da]' : 'bg-gray-600'}`}>
                      {cleaner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-display uppercase tracking-wide text-base sm:text-lg truncate">{cleaner.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-semibold ${cleaner.pay_type === 'flat_rate' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {cleaner.pay_type === 'flat_rate' ? `FLAT $${cleaner.flat_rate_per_clean}/clean` : `$${cleaner.hourly_rate}/hr`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-semibold ${cleaner.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {cleaner.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl sm:text-3xl font-bold text-white font-display">${totalPay.toFixed(2)}</p>
                    <p className="text-gray-400 text-xs font-body">{totalCleans} clean{totalCleans !== 1 ? 's' : ''} pending</p>
                  </div>
                </div>

                {/* Clean details list - synced to clean_date */}
                {records.length > 0 && (
                  <div className="ios-list mx-4 sm:mx-5 mb-4 rounded-xl">
                    {records.map(rec => (
                      <div key={rec.id} className="ios-row !px-4 !py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-[#3AA3EB]/15 flex items-center justify-center shrink-0">
                            <Calendar className="text-[#3AA3EB]" size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-body text-sm font-medium truncate">{rec.property_name || 'Property'}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs font-body text-gray-400">
                              <span>{format(parseISO(rec.clean_date), 'MMM d, yyyy')}</span>
                              {cleaner.pay_type === 'hourly' && rec.hours_worked != null && (
                                <span className="flex items-center gap-1">
                                  <Clock size={11} /> {rec.hours_worked}h
                                </span>
                              )}
                              {cleaner.pay_type === 'flat_rate' && (
                                <span className="text-orange-400">Flat rate</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-white font-display text-sm">${Number(rec.pay_amount).toFixed(2)}</span>
                          <button
                            onClick={() => markCleanPaid(rec.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-400/15 transition-all"
                            title="Mark as paid"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer - Pay All */}
                {records.length > 0 && (
                  <div className="px-4 sm:px-5 pb-4 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
                    <div className="text-xs font-body text-gray-400">
                      {cleaner.pay_type === 'hourly' && `Total: ${totalHours.toFixed(1)} hrs`}
                      {cleaner.pay_type === 'flat_rate' && `Total: ${totalCleans} flat-rate clean${totalCleans !== 1 ? 's' : ''}`}
                    </div>
                    <button
                      onClick={() => markAllPaid(cleaner.id)}
                      className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-all font-body text-sm font-medium"
                    >
                      Mark All Paid
                    </button>
                  </div>
                )}

                {records.length === 0 && (
                  <div className="px-4 sm:px-5 pb-4">
                    <p className="text-gray-500 font-body text-sm text-center py-2">No pending cleans</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* CLEANS TAB - All clean records sorted by clean_date */}
      {!loading && activeTab === 'cleans' && (
        <div className="space-y-3">
          {cleanRecords.length === 0 ? (
            <div className="ios-card rounded-2xl p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 font-display uppercase tracking-wide">No clean records</h3>
              <p className="text-gray-400 font-body text-sm mb-4">Add a clean record to start tracking.</p>
              <button onClick={() => setShowAddClean(true)} className="px-5 py-2.5 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl transition-colors font-body text-sm font-medium">
                Add First Clean
              </button>
            </div>
          ) : (
            cleanRecords.map(rec => {
              const cleaner = cleanerById(rec.cleaner_id);
              return (
                <div key={rec.id} className="ios-card rounded-2xl p-4 flex items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${rec.status === 'paid' ? 'bg-green-500/15' : 'bg-[#3AA3EB]/15'}`}>
                    <Calendar className={rec.status === 'paid' ? 'text-green-400' : 'text-[#3AA3EB]'} size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-body text-sm font-medium truncate">{cleaner?.name || 'Unknown'}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs font-body text-gray-400 flex-wrap">
                      <span>{format(parseISO(rec.clean_date), 'MMM d, yyyy')}</span>
                      {rec.property_name && <span className="truncate">· {rec.property_name}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs font-body">
                      {cleaner?.pay_type === 'hourly' && rec.hours_worked != null && (
                        <span className="flex items-center gap-1 text-blue-400">
                          <Clock size={11} /> {rec.hours_worked} hrs
                        </span>
                      )}
                      {cleaner?.pay_type === 'flat_rate' && (
                        <span className="text-orange-400 font-medium">Flat rate</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-white font-display text-base sm:text-lg">${Number(rec.pay_amount).toFixed(2)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-semibold ${rec.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {rec.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TEAM TAB - All cleaners */}
      {!loading && activeTab === 'team' && (
        <div className="space-y-3">
          {cleaners.length === 0 ? (
            <div className="ios-card rounded-2xl p-12 text-center">
              <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 font-display uppercase tracking-wide">No team members</h3>
              <p className="text-gray-400 font-body text-sm mb-4">Add your first cleaner to get started.</p>
              <button onClick={() => setShowAddCleaner(true)} className="px-5 py-2.5 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl transition-colors font-body text-sm font-medium">
                Add First Cleaner
              </button>
            </div>
          ) : (
            cleaners.map(cleaner => {
              const cleans = cleanRecords.filter(r => r.cleaner_id === cleaner.id);
              return (
                <div key={cleaner.id} className="ios-card rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 font-display text-white ${cleaner.status === 'active' ? 'bg-gradient-to-br from-[#3AA3EB] to-[#2a92da]' : 'bg-gray-600'}`}>
                      {cleaner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-display uppercase tracking-wide text-base sm:text-lg truncate">{cleaner.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-semibold ${cleaner.pay_type === 'flat_rate' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {cleaner.pay_type === 'flat_rate' ? `FLAT $${cleaner.flat_rate_per_clean}/clean` : `$${cleaner.hourly_rate}/hr`}
                        </span>
                        <span className="text-gray-400 text-xs font-body">{cleans.length} total cleans</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCleanerStatus(cleaner)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-all shrink-0 ${cleaner.status === 'active' ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                    >
                      {cleaner.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  {(cleaner.email || cleaner.phone) && (
                    <div className="ios-list mt-4 rounded-xl">
                      {cleaner.email && (
                        <div className="ios-row !px-4 !py-2.5 flex items-center gap-3">
                          <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-200 font-body truncate">{cleaner.email}</span>
                        </div>
                      )}
                      {cleaner.phone && (
                        <div className="ios-row !px-4 !py-2.5 flex items-center gap-3">
                          <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-200 font-body truncate">{cleaner.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Clean Modal */}
      {showAddClean && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAddClean(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="ios-modal-panel rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto ios-scroll">
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <h3 className="text-white font-display uppercase tracking-wide text-lg">Add Clean Record</h3>
                <button onClick={() => setShowAddClean(false)} className="ios-close-btn rounded-full p-1.5">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="ios-section-header !px-0 !pb-1.5">Cleaner</label>
                  <select
                    value={newClean.cleaner_id}
                    onChange={e => setNewClean({ ...newClean, cleaner_id: e.target.value })}
                    className="ios-select w-full"
                  >
                    <option value="">Select cleaner...</option>
                    {cleaners.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="ios-section-header !px-0 !pb-1.5">Date of Clean</label>
                  <input
                    type="date"
                    value={newClean.clean_date}
                    onChange={e => setNewClean({ ...newClean, clean_date: e.target.value })}
                    className="ios-input w-full"
                  />
                </div>
                {newClean.cleaner_id && cleanerById(newClean.cleaner_id)?.pay_type === 'hourly' && (
                  <div>
                    <label className="ios-section-header !px-0 !pb-1.5">Hours Worked</label>
                    <input
                      type="number"
                      step="0.25"
                      value={newClean.hours_worked}
                      onChange={e => setNewClean({ ...newClean, hours_worked: e.target.value })}
                      className="ios-input w-full"
                      placeholder="e.g. 4.5"
                    />
                  </div>
                )}
                <div>
                  <label className="ios-section-header !px-0 !pb-1.5">Property Name</label>
                  <input
                    type="text"
                    value={newClean.property_name}
                    onChange={e => setNewClean({ ...newClean, property_name: e.target.value })}
                    className="ios-input w-full"
                    placeholder="e.g. Ocean Drive Unit 12"
                  />
                </div>
                <div>
                  <label className="ios-section-header !px-0 !pb-1.5">Notes (optional)</label>
                  <textarea
                    value={newClean.notes}
                    onChange={e => setNewClean({ ...newClean, notes: e.target.value })}
                    className="ios-input w-full"
                    rows={2}
                    placeholder="Turnover clean, extra towels, etc."
                  />
                </div>
                {newClean.cleaner_id && (
                  <div className="ios-card rounded-xl p-3 flex items-center gap-2">
                    <Sparkles className="text-[#3AA3EB]" size={16} />
                    <span className="text-gray-300 font-body text-sm">
                      Pay will be calculated automatically:
                      {' $'}
                      {(() => {
                        const c = cleanerById(newClean.cleaner_id);
                        if (!c) return '0.00';
                        if (c.pay_type === 'flat_rate') return Number(c.flat_rate_per_clean).toFixed(2);
                        const h = newClean.hours_worked ? parseFloat(newClean.hours_worked) : 0;
                        return (h * Number(c.hourly_rate)).toFixed(2);
                      })()}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleAddClean}
                  disabled={!newClean.cleaner_id || !newClean.clean_date}
                  className="w-full py-3 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all font-body font-medium"
                >
                  Add Clean Record
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Cleaner Modal */}
      {showAddCleaner && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAddCleaner(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="ios-modal-panel rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto ios-scroll">
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <h3 className="text-white font-display uppercase tracking-wide text-lg">Add Cleaner</h3>
                <button onClick={() => setShowAddCleaner(false)} className="ios-close-btn rounded-full p-1.5">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="ios-section-header !px-0 !pb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={newCleaner.name}
                    onChange={e => setNewCleaner({ ...newCleaner, name: e.target.value })}
                    className="ios-input w-full"
                    placeholder="e.g. Melissa Juarez"
                  />
                </div>
                <div>
                  <label className="ios-section-header !px-0 !pb-1.5">Email (optional)</label>
                  <input
                    type="email"
                    value={newCleaner.email}
                    onChange={e => setNewCleaner({ ...newCleaner, email: e.target.value })}
                    className="ios-input w-full"
                    placeholder="melissa@wisestr.com"
                  />
                </div>
                <div>
                  <label className="ios-section-header !px-0 !pb-1.5">Phone (optional)</label>
                  <input
                    type="tel"
                    value={newCleaner.phone}
                    onChange={e => setNewCleaner({ ...newCleaner, phone: e.target.value })}
                    className="ios-input w-full"
                    placeholder="(305) 555-0101"
                  />
                </div>
                <div>
                  <label className="ios-section-header !px-0 !pb-1.5">Pay Type</label>
                  <div className="ios-segmented">
                    <button
                      onClick={() => setNewCleaner({ ...newCleaner, pay_type: 'hourly' })}
                      className={`ios-segmented-btn ${newCleaner.pay_type === 'hourly' ? 'active' : ''}`}
                    >
                      Hourly
                    </button>
                    <button
                      onClick={() => setNewCleaner({ ...newCleaner, pay_type: 'flat_rate' })}
                      className={`ios-segmented-btn ${newCleaner.pay_type === 'flat_rate' ? 'active' : ''}`}
                    >
                      Flat Rate
                    </button>
                  </div>
                </div>
                {newCleaner.pay_type === 'hourly' ? (
                  <div>
                    <label className="ios-section-header !px-0 !pb-1.5">Hourly Rate ($)</label>
                    <input
                      type="number"
                      step="0.50"
                      value={newCleaner.hourly_rate}
                      onChange={e => setNewCleaner({ ...newCleaner, hourly_rate: e.target.value })}
                      className="ios-input w-full"
                      placeholder="25.00"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="ios-section-header !px-0 !pb-1.5">Flat Rate Per Clean ($)</label>
                    <input
                      type="number"
                      step="5.00"
                      value={newCleaner.flat_rate_per_clean}
                      onChange={e => setNewCleaner({ ...newCleaner, flat_rate_per_clean: e.target.value })}
                      className="ios-input w-full"
                      placeholder="80.00"
                    />
                  </div>
                )}
                <button
                  onClick={handleAddCleaner}
                  disabled={!newCleaner.name}
                  className="w-full py-3 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all font-body font-medium"
                >
                  Add Cleaner
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
