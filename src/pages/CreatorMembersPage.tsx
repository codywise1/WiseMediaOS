import { useState, useEffect } from 'react';
import { Search, Users, Star, Mail, Calendar, MapPin, X } from 'lucide-react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';

interface Member {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  avatar_url: string | null;
  location: string | null;
  subscription_type: string | null;
  created_at: string;
  instagram: string | null;
  twitter: string | null;
}

function MemberBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-[#3aa3eb]/10 border-[#3aa3eb]/30 text-[#3aa3eb]">
      <Star className="h-3 w-3" />
      Creator
    </span>
  );
}

function MemberAvatar({ member }: { member: Member }) {
  const initials = (member.full_name || member.email)
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (member.avatar_url) {
    return <img src={member.avatar_url} alt={member.full_name ?? ''} className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/10" />;
  }
  return (
    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#3aa3eb]/30 to-[#3aa3eb]/10 flex items-center justify-center ring-2 ring-white/10">
      <span className="text-sm font-bold text-[#3aa3eb]">{initials}</span>
    </div>
  );
}

export default function CreatorMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    if (!isSupabaseAvailable()) { setLoading(false); return; }
    const { data, error } = await supabase!
      .from('profiles')
      .select('id, full_name, email, role, avatar_url, location, subscription_type, created_at, instagram, twitter')
      .eq('role', 'member')
      .order('created_at', { ascending: false });
    if (!error && data) setMembers(data as Member[]);
    setLoading(false);
  }

  const filtered = members
    .filter(m => {
      const q = search.toLowerCase();
      return !q || (m.full_name ?? '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email);
      const aT = new Date(a.created_at).getTime();
      const bT = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? bT - aT : aT - bT;
    });

  return (
    <div className="space-y-8">
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="font-display font-bold gradient-text leading-tight tracking-tight uppercase mb-2" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)' }}>
              Creator Club
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">All Creator Club members who have signed up to the platform.</p>
          </div>
        </div>

        {/* Stat pill */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-lg font-black text-[#3aa3eb]">{members.length}</span>
            <span className="text-xs text-gray-500">Total Members</span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/[0.08] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2.5 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {/* Members grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3aa3eb]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">No members found</p>
            <p className="text-gray-600 text-sm mt-1">
              {members.length === 0 ? 'No Creator Club members have signed up yet.' : 'Try adjusting your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(member => (
              <div key={member.id} className="ios-card rounded-2xl p-4 sm:p-5 flex flex-col gap-4 hover:bg-white/[0.07] transition-all duration-200">
                <div className="flex items-start gap-3">
                  <MemberAvatar member={member} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate leading-tight">{member.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{member.email}</p>
                    <div className="mt-1.5"><MemberBadge /></div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                  {member.location && (
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{member.location}</span>
                  )}
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" />Joined {formatAppDate(member.created_at)}</span>
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" />{member.email}</span>
                </div>
                {(member.instagram || member.twitter) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 text-xs text-gray-500">
                    {member.instagram && <span>@{member.instagram.replace(/^@/, '')} (IG)</span>}
                    {member.twitter && <span>@{member.twitter.replace(/^@/, '')} (X)</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-center text-xs text-gray-600 mt-6">
            Showing {filtered.length} of {members.length} members
          </p>
        )}
      </div>
    </div>
  );
}
