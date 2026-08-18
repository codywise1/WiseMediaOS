import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CreditCard as Edit2, X, Check, Search, Camera, AlertTriangle, Sparkles, CheckCircle2, Clock, User, MapPin, DollarSign } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';

type ConditionLabel = 'before' | 'after' | 'damage';

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
  condition_label: ConditionLabel | null;
  created_at: string;
  cleaners?: Cleaner;
}

const CONDITION_CONFIG: Record<ConditionLabel, { label: string; icon: typeof Camera; color: string; bg: string; border: string }> = {
  before: {
    label: 'Before Clean',
    icon: Camera,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
  },
  after: {
    label: 'After Clean',
    icon: Sparkles,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
  },
  damage: {
    label: 'Damage',
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
  },
};

function ConditionPill({ label, size = 'md' }: { label: ConditionLabel; size?: 'sm' | 'md' }) {
  const cfg = CONDITION_CONFIG[label];
  const Icon = cfg.icon;
  const sz = size === 'sm' ? 'text-[10px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';
  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${cfg.bg} ${cfg.color} ${cfg.border} ${sz}`}>
      <Icon size={size === 'sm' ? 10 : 12} />
      {cfg.label}
    </span>
  );
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function CleaningPage() {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [records, setRecords] = useState<CleanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState<ConditionLabel | 'all'>('all');
  const [filterCleaner, setFilterCleaner] = useState<string | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CleanRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CleanRecord | null>(null);

  // form state
  const [fCleanerId, setFCleanerId] = useState('');
  const [fCleanDate, setFCleanDate] = useState(new Date().toISOString().slice(0, 10));
  const [fProperty, setFProperty] = useState('');
  const [fHours, setFHours] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fCondition, setFCondition] = useState<ConditionLabel>('before');

  const loadData = useCallback(async () => {
    if (!isSupabaseAvailable()) { setLoading(false); return; }
    setLoading(true);
    const [cleanerRes, recordRes] = await Promise.all([
      supabase!.from('cleaners').select('*').order('name'),
      supabase!.from('clean_records')
        .select('id,cleaner_id,clean_date,hours_worked,property_name,notes,pay_amount,status,condition_label,created_at,cleaners(id,name,email,phone,pay_type,hourly_rate,flat_rate_per_clean,status)')
        .order('clean_date', { ascending: false })
        .limit(200),
    ]);
    if (cleanerRes.data) setCleaners(cleanerRes.data as Cleaner[]);
    if (recordRes.data) setRecords(recordRes.data as CleanRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() {
    setEditingRecord(null);
    setFCleanerId(cleaners[0]?.id ?? '');
    setFCleanDate(new Date().toISOString().slice(0, 10));
    setFProperty('');
    setFHours('');
    setFNotes('');
    setFCondition('before');
    setIsModalOpen(true);
  }

  function openEdit(rec: CleanRecord) {
    setEditingRecord(rec);
    setFCleanerId(rec.cleaner_id);
    setFCleanDate(rec.clean_date);
    setFProperty(rec.property_name ?? '');
    setFHours(rec.hours_worked?.toString() ?? '');
    setFNotes(rec.notes ?? '');
    setFCondition(rec.condition_label ?? 'before');
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!isSupabaseAvailable() || !fCleanerId) return;
    setSaving(true);
    const cleaner = cleaners.find(c => c.id === fCleanerId);
    const hours = fHours.trim() ? parseFloat(fHours) : null;
    let pay = 0;
    if (cleaner) {
      if (cleaner.pay_type === 'hourly' && hours != null) {
        pay = hours * (cleaner.hourly_rate || 0);
      } else if (cleaner.pay_type === 'flat_rate') {
        pay = cleaner.flat_rate_per_clean || 0;
      }
    }

    const payload = {
      cleaner_id: fCleanerId,
      clean_date: fCleanDate,
      property_name: fProperty.trim() || null,
      hours_worked: hours,
      notes: fNotes.trim() || null,
      pay_amount: Math.round(pay * 100) / 100,
      condition_label: fCondition,
    };

    if (editingRecord) {
      const { error } = await supabase!.from('clean_records').update(payload).eq('id', editingRecord.id);
      if (!error) setRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...payload } : r));
    } else {
      const { data, error } = await supabase!.from('clean_records').insert(payload).select('id,cleaner_id,clean_date,hours_worked,property_name,notes,pay_amount,status,condition_label,created_at').single();
      if (data && !error) {
        const newRec = { ...(data as CleanRecord), cleaners: cleaner };
        setRecords(prev => [newRec, ...prev]);
      }
    }
    setSaving(false);
    setIsModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget || !isSupabaseAvailable()) return;
    await supabase!.from('clean_records').delete().eq('id', deleteTarget.id);
    setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  async function quickLabel(rec: CleanRecord, label: ConditionLabel) {
    if (!isSupabaseAvailable()) return;
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, condition_label: label } : r));
    await supabase!.from('clean_records').update({ condition_label: label }).eq('id', rec.id);
  }

  const filtered = records.filter(r => {
    if (filterCondition !== 'all' && r.condition_label !== filterCondition) return false;
    if (filterCleaner !== 'all' && r.cleaner_id !== filterCleaner) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = (r.property_name ?? '').toLowerCase().includes(q) ||
        (r.cleaners?.name ?? '').toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const stats = {
    total: records.length,
    before: records.filter(r => r.condition_label === 'before').length,
    after: records.filter(r => r.condition_label === 'after').length,
    damage: records.filter(r => r.condition_label === 'damage').length,
  };

  const FILTER_CONDITIONS: { id: ConditionLabel | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'before', label: 'Before' },
    { id: 'after', label: 'After' },
    { id: 'damage', label: 'Damage' },
  ];

  return (
    <div className="h-full flex flex-col overflow-y-auto gap-4">
      <PageHeader
        title="Cleaning"
        subtitle="Track cleans and label property conditions."
        action={
          <button onClick={openCreate} className="btn-header-glass flex items-center gap-2">
            <Plus size={16} />
            <span className="btn-text-glow text-sm">Log Clean</span>
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Cleans', value: stats.total, icon: CheckCircle2, color: 'text-[#3aa3eb]' },
          { label: 'Before', value: stats.before, icon: Camera, color: 'text-amber-400' },
          { label: 'After', value: stats.after, icon: Sparkles, color: 'text-emerald-400' },
          { label: 'Damage', value: stats.damage, icon: AlertTriangle, color: 'text-red-400' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/5 ${s.color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white leading-none">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="glass-card rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="overflow-x-auto scrollbar-hide sm:order-1">
            <div className="ios-segmented inline-flex min-w-max">
              {FILTER_CONDITIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilterCondition(opt.id)}
                  className={`ios-segmented-btn flex-shrink-0 ${filterCondition === opt.id ? 'active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <select
            value={filterCleaner}
            onChange={e => setFilterCleaner(e.target.value)}
            className="form-input rounded-xl px-3 py-2 text-sm sm:order-2"
          >
            <option value="all">All Cleaners</option>
            {cleaners.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="relative sm:order-3 sm:ml-auto sm:w-56 flex-shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input w-full pl-9 pr-8 py-2 rounded-xl text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10">
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3aa3eb]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Camera className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">No clean records found</p>
          <p className="text-gray-600 text-sm mt-1">
            {records.length === 0 ? 'Log your first clean to get started.' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
          {filtered.map(rec => {
            const cleaner = rec.cleaners ?? cleaners.find(c => c.id === rec.cleaner_id);
            const condition = rec.condition_label;
            const cfg = condition ? CONDITION_CONFIG[condition] : null;
            return (
              <div
                key={rec.id}
                className={`glass-card rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 ${cfg ? `border ${cfg.border}` : ''}`}
              >
                {/* Top: cleaner + condition */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3aa3eb]/30 to-[#3aa3eb]/10 flex items-center justify-center text-sm font-bold text-[#3aa3eb] flex-shrink-0">
                      {getInitials(cleaner?.name ?? '?')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{cleaner?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{formatAppDate(rec.clean_date)}</p>
                    </div>
                  </div>
                  {condition && <ConditionPill label={condition} size="sm" />}
                </div>

                {/* Property */}
                {rec.property_name && (
                  <p className="flex items-center gap-1.5 text-sm text-gray-300">
                    <MapPin size={14} className="text-gray-500 shrink-0" />
                    {rec.property_name}
                  </p>
                )}

                {/* Notes */}
                {rec.notes && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{rec.notes}</p>
                )}

                {/* Pay + hours */}
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                  {rec.hours_worked != null && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {rec.hours_worked}h
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <DollarSign size={12} />
                    {rec.pay_amount.toFixed(2)}
                  </span>
                  {rec.status === 'paid' && (
                    <span className="text-emerald-400 font-semibold">Paid</span>
                  )}
                </div>

                {/* Quick label buttons */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                  <button
                    onClick={() => quickLabel(rec, 'before')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      condition === 'before' ? 'bg-amber-400/15 border-amber-400/40 text-amber-400' : 'border-white/10 text-gray-500 hover:bg-white/5'
                    }`}
                  >
                    <Camera size={11} /> Before
                  </button>
                  <button
                    onClick={() => quickLabel(rec, 'after')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      condition === 'after' ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-400' : 'border-white/10 text-gray-500 hover:bg-white/5'
                    }`}
                  >
                    <Sparkles size={11} /> After
                  </button>
                  <button
                    onClick={() => quickLabel(rec, 'damage')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      condition === 'damage' ? 'bg-red-400/15 border-red-400/40 text-red-400' : 'border-white/10 text-gray-500 hover:bg-white/5'
                    }`}
                  >
                    <AlertTriangle size={11} /> Damage
                  </button>

                  <div className="ml-auto flex items-center gap-0.5">
                    <button onClick={() => openEdit(rec)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(rec)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && filtered.length < records.length && (
        <p className="text-center text-xs text-gray-600 pb-4">
          Showing {filtered.length} of {records.length} records
        </p>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecord ? 'Edit Clean' : 'Log New Clean'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {/* Cleaner */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Cleaner</label>
            <select
              value={fCleanerId}
              onChange={e => setFCleanerId(e.target.value)}
              className="form-input w-full rounded-xl px-4 py-3"
            >
              {cleaners.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date + Property */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Date</label>
              <input
                type="date"
                value={fCleanDate}
                onChange={e => setFCleanDate(e.target.value)}
                className="form-input w-full rounded-xl px-4 py-3"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Property</label>
              <input
                type="text"
                value={fProperty}
                onChange={e => setFProperty(e.target.value)}
                placeholder="Ocean Drive Unit 12"
                className="form-input w-full rounded-xl px-4 py-3"
              />
            </div>
          </div>

          {/* Hours */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Hours Worked <span className="text-gray-600">(leave blank for flat-rate)</span></label>
            <input
              type="number"
              step="0.25"
              value={fHours}
              onChange={e => setFHours(e.target.value)}
              placeholder="4.5"
              className="form-input w-full rounded-xl px-4 py-3"
            />
          </div>

          {/* Condition Label */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Condition Label</label>
            <div className="grid grid-cols-3 gap-2">
              {(['before', 'after', 'damage'] as ConditionLabel[]).map(label => {
                const cfg = CONDITION_CONFIG[label];
                const Icon = cfg.icon;
                const active = fCondition === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFCondition(label)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                      active ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-white/10 text-gray-500 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-semibold">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Notes</label>
            <textarea
              value={fNotes}
              onChange={e => setFNotes(e.target.value)}
              rows={3}
              placeholder="Turnover clean, extra towels, etc."
              className="form-input w-full rounded-xl px-4 py-3"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !fCleanerId}
              className="px-6 py-2 bg-[#3aa3eb] hover:bg-[#2a92da] disabled:bg-[#3aa3eb]/50 text-white rounded-lg transition-all font-bold text-sm shadow-lg shadow-[#3aa3eb]/20 flex items-center gap-2"
            >
              {saving ? 'Saving...' : (editingRecord ? 'Update' : 'Log Clean')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Clean Record"
        message={`Delete the clean record for ${deleteTarget?.property_name ?? 'this property'}? This cannot be undone.`}
        confirmText="Delete"
        destructive={true}
      />
    </div>
  );
}
