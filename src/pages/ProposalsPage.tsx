import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { formatAppDate } from '../lib/dateFormat';
import {
  Plus, X, Send, FileText, ChevronRight, CheckCircle2, Clock,
  XCircle, PencilLine, TrendingUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Proposal {
  id: string;
  title: string;
  content: string | null;
  status: string;
  created_at: string;
  admin_id: string | null;
  client_id: string | null;
  value?: number | null;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string; border: string; icon: typeof Clock }> = {
  accepted: { label: 'Accepted', dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
  sent: { label: 'Sent', dot: 'bg-blue-400', text: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Send },
  draft: { label: 'Draft', dot: 'bg-slate-400', text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: PencilLine },
  rejected: { label: 'Rejected', dot: 'bg-rose-400', text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: XCircle },
  expired: { label: 'Expired', dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
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

export default function ProposalsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProposals(); }, [profile]);

  async function fetchProposals() {
    if (!profile || !supabase) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .or(`admin_id.eq.${profile.id},client_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProposals(data || []);
    } catch (e) { console.error('Error fetching proposals:', e); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!profile || !supabase || !formData.title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('proposals').insert({
        title: formData.title,
        content: formData.content,
        admin_id: profile.id,
        status: 'draft',
      });
      if (!error) {
        setShowModal(false);
        setFormData({ title: '', content: '' });
        fetchProposals();
      }
    } catch (e) { console.error(e); alert('Failed to create proposal'); }
    finally { setSaving(false); }
  }

  const stats = useMemo(() => {
    const accepted = proposals.filter(p => p.status === 'accepted');
    const sent = proposals.filter(p => p.status === 'sent');
    const draft = proposals.filter(p => p.status === 'draft');
    const totalValue = accepted.reduce((s, p) => s + (p.value || 0), 0);
    return {
      total: proposals.length,
      accepted: accepted.length,
      sent: sent.length,
      draft: draft.length,
      totalValue,
      winRate: proposals.length ? Math.round((accepted.length / proposals.length) * 100) : 0,
    };
  }, [proposals]);

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Proposals"
          subtitle="Create and send professional proposals to clients."
          action={
            <button onClick={() => setShowModal(true)} className="btn-header-glass space-x-2 w-full sm:w-auto">
              <Plus size={18} className="text-[#3AA3EB]" />
              <span className="btn-text-glow">New Proposal</span>
            </button>
          }
        />

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            label="Total Value"
            value={`$${stats.totalValue.toLocaleString()}`}
            sub={`${stats.accepted} accepted proposal${stats.accepted === 1 ? '' : 's'}`}
            icon={TrendingUp}
            accent="bg-emerald-500/15 text-emerald-300"
          />
          <StatCard
            label="Win Rate"
            value={`${stats.winRate}%`}
            sub={`${stats.accepted} of ${stats.total} proposals`}
            icon={CheckCircle2}
            accent="bg-blue-500/15 text-blue-300"
          />
          <StatCard
            label="In Progress"
            value={`${stats.sent + stats.draft}`}
            sub={`${stats.sent} sent · ${stats.draft} draft${stats.draft === 1 ? '' : 's'}`}
            icon={Clock}
            accent="bg-amber-500/15 text-amber-300"
          />
        </div>

        {/* Proposals list */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-white font-bold text-base" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>
              All Proposals
            </h2>
            <span className="text-gray-500 text-xs">{proposals.length} total</span>
          </div>

          {loading ? (
            <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
              <div className="inline-block w-6 h-6 border-2 border-white/20 border-t-[#3AA3EB] rounded-full animate-spin" />
              <p className="text-gray-500 text-sm mt-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>Loading proposals...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-gray-600" />
              </div>
              <p className="text-white font-semibold text-sm mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>No proposals yet</p>
              <p className="text-gray-500 text-xs">Create your first proposal to start winning clients.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {proposals.map((proposal) => {
                const cfg = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
                const StatusIcon = cfg.icon;
                return (
                  <button
                    key={proposal.id}
                    onClick={() => navigate(`/proposals/${proposal.id}`)}
                    className="ios-card w-full rounded-3xl p-5 sm:p-6 border border-white/10 text-left transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/20 active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-4 sm:gap-5">
                      {/* Left: status icon */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <StatusIcon size={20} className={cfg.text} />
                      </div>

                      {/* Middle: content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <p className="text-white font-semibold text-[15px] truncate" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>
                            {proposal.title}
                          </p>
                          <StatusPill status={proposal.status} />
                        </div>
                        <div className="flex items-center gap-3 text-gray-500 text-xs">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatAppDate(proposal.created_at)}
                          </span>
                          {proposal.value != null && proposal.value > 0 && (
                            <span className="text-gray-400">
                              ${proposal.value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: chevron */}
                      <div className="flex items-center gap-3 flex-shrink-0">
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
            <div className="w-full max-w-2xl">
              <div className="ios-card rounded-3xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h3 className="text-white font-bold text-lg font-display">New Proposal</h3>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all"
                      placeholder="Enter proposal title"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Content</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all h-32 resize-none"
                      placeholder="Enter proposal details"
                    />
                  </div>
                </div>
                <div className="flex gap-3 p-6 border-t border-white/10">
                  <button onClick={handleSave} disabled={saving || !formData.title.trim()} className="flex-1 py-3.5 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/40 text-white rounded-2xl transition-all font-semibold flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                    {saving ? 'Creating...' : 'Create Proposal'}
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
