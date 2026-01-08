import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { FileText, Plus, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import { useAuth } from '../contexts/AuthContext';

interface Proposal {
  id: string;
  title: string;
  content: string | null;
  status: string;
  created_at: string;
  admin_id: string | null;
  client_id: string | null;
}

export default function ProposalsPage() {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, [profile]);

  async function fetchProposals() {
    if (!profile || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .or(`admin_id.eq.${profile.id},client_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
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

      if (error) throw error;

      setShowModal(false);
      setFormData({ title: '', content: '' });
      fetchProposals();
    } catch (error) {
      console.error('Error creating proposal:', error);
      alert('Failed to create proposal');
    } finally {
      setSaving(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/20 text-green-400';
      case 'sent': return 'bg-blue-500/20 text-blue-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white text-[40px]" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Proposals
          </h1>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
            <Plus size={20} />
            New Proposal
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <GlassCard>
              <p className="text-gray-400 text-center py-8" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Loading proposals...</p>
            </GlassCard>
          ) : proposals.length === 0 ? (
            <GlassCard>
              <p className="text-gray-400 text-center py-8" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>No proposals yet. Click "New Proposal" to create one.</p>
            </GlassCard>
          ) : (
            proposals.map((proposal) => (
              <GlassCard key={proposal.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-lg">
                      <FileText className="text-indigo-400" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{proposal.title}</h3>
                      <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{formatAppDate(proposal.created_at)}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(proposal.status)}`} style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
                    {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                  </span>
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
                  <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Proposal</h3>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Title</label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" placeholder="Enter proposal title" />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Content</label>
                    <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none h-32" placeholder="Enter proposal details" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={handleSave} disabled={saving || !formData.title.trim()} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg transition-colors font-medium">
                      <Send size={20} className="inline mr-2" />
                      {saving ? 'Creating...' : 'Create Proposal'}
                    </button>
                    <button onClick={() => setShowModal(false)} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors">Cancel</button>
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
