import { useState, useEffect, useRef } from 'react';
import { Search, Users, Mail, Calendar, MapPin, X, Trash2, Instagram, Twitter, MoreHorizontal } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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

function MemberAvatar({ member, size = 'md' }: { member: Member; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (member.full_name || member.email)
    .split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-14 w-14 text-sm', lg: 'h-16 w-16 text-base' };
  const cls = sizes[size];

  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.full_name ?? ''}
        className={`${cls} rounded-full object-cover ring-2 ring-white/10 flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-[#3aa3eb]/30 to-[#3aa3eb]/10 flex items-center justify-center ring-2 ring-white/10 flex-shrink-0`}>
      <span className="font-bold text-[#3aa3eb]">{initials}</span>
    </div>
  );
}

function MemberPill() {
  return (
    <span className="ios-segmented-btn active pointer-events-none text-[11px] !py-0.5 !px-2.5">
      Member
    </span>
  );
}

export default function CreatorMembersPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = (profile?.role || '').toLowerCase() === 'admin';

  useEffect(() => { loadMembers(); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  async function handleDelete() {
    if (!deleteTarget || !isSupabaseAvailable()) return;
    setDeleting(true);
    await supabase!.from('profiles').delete().eq('id', deleteTarget.id);
    setMembers(prev => prev.filter(m => m.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
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

  const SORT_OPTIONS = [
    { id: 'newest', label: 'Newest' },
    { id: 'oldest', label: 'Oldest' },
    { id: 'name', label: 'A–Z' },
  ] as const;

  return (
    <div className="h-full flex flex-col overflow-y-auto gap-4">
      <PageHeader
        title="Members"
        subtitle={`${members.length} Creator Club member${members.length !== 1 ? 's' : ''}`}
      />

      {/* Filter bar */}
      <div className="glass-card rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Search */}
          <div className="relative sm:order-2 sm:ml-auto sm:w-56 flex-shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search members..."
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
          {/* Sort pills */}
          <div className="overflow-x-auto scrollbar-hide sm:order-1">
            <div className="ios-segmented inline-flex min-w-max">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={`ios-segmented-btn flex-shrink-0 ${sortBy === opt.id ? 'active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3aa3eb]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">No members found</p>
          <p className="text-gray-600 text-sm mt-1">
            {members.length === 0 ? 'No Creator Club members have signed up yet.' : 'Try a different search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
          {filtered.map(member => (
            <div
              key={member.id}
              className="glass-card rounded-2xl p-5 flex flex-col gap-4 hover:bg-white/[0.06] transition-all duration-200"
            >
              {/* Top row: avatar + name + admin menu */}
              <div className="flex items-start gap-3">
                <MemberAvatar member={member} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate leading-tight">
                    {member.full_name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{member.email}</p>
                  <div className="mt-2">
                    <MemberPill />
                  </div>
                </div>

                {/* Admin kebab menu */}
                {isAdmin && (
                  <div className="relative" ref={openMenuId === member.id ? menuRef : undefined}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {openMenuId === member.id && (
                      <div className="absolute right-0 top-8 z-20 bg-[#111] border border-white/10 rounded-xl shadow-2xl min-w-[140px] overflow-hidden">
                        <button
                          onClick={() => { setDeleteTarget(member); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-all"
                        >
                          <Trash2 size={14} />
                          Remove Member
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                {member.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {member.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Joined {formatAppDate(member.created_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {member.email}
                </span>
              </div>

              {/* Social links */}
              {(member.instagram || member.twitter) && (
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  {member.instagram && (
                    <a
                      href={`https://instagram.com/${member.instagram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#3aa3eb] transition-colors"
                    >
                      <Instagram className="h-3.5 w-3.5" />
                      @{member.instagram.replace(/^@/, '')}
                    </a>
                  )}
                  {member.twitter && (
                    <a
                      href={`https://x.com/${member.twitter.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#3aa3eb] transition-colors"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      @{member.twitter.replace(/^@/, '')}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && filtered.length < members.length && (
        <p className="text-center text-xs text-gray-600 pb-4">
          Showing {filtered.length} of {members.length} members
        </p>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Member"
        message={`Remove ${deleteTarget?.full_name ?? deleteTarget?.email ?? 'this member'} from Creator Club? This cannot be undone.`}
        confirmText={deleting ? 'Removing...' : 'Remove'}
        destructive={true}
      />
    </div>
  );
}
