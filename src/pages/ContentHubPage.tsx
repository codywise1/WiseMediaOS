import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rss, Youtube, Linkedin, Facebook, FileText, Star, Eye, EyeOff,
  RefreshCw, Clock, Play, MessageCircle, Bookmark, ArrowRight, Plus, Pencil, Trash2, Settings,
  Twitter, Instagram,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ContentHubAdminModal, { HubItem, ContentSource } from '../components/ContentHubAdminModal';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatAppDateTime } from '../lib/dateFormat';

type ContentSourceAll = ContentSource | 'all';

interface ReactionData {
  counts: Record<string, number>;
  mine: string | null;
}

const SOURCE_CONFIG: Record<ContentSource, { label: string; icon: typeof Rss; color: string; bg: string }> = {
  blog: { label: 'Blog', icon: FileText, color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-500/40' },
  twitter: { label: 'X / Twitter', icon: Twitter, color: 'text-gray-200', bg: 'bg-gray-500/20 border-gray-500/40' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-300', bg: 'bg-pink-500/20 border-pink-500/40' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-300', bg: 'bg-blue-500/20 border-blue-500/40' },
  youtube: { label: 'YouTube', icon: Youtube, color: 'text-red-300', bg: 'bg-red-500/20 border-red-500/40' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-sky-300', bg: 'bg-sky-500/20 border-sky-500/40' },
};

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '👏', '😮', '💯'];

function SourceBadge({ source }: { source: ContentSource }) {
  const cfg = SOURCE_CONFIG[source];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} uppercase tracking-wider`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="ios-card rounded-3xl overflow-hidden border border-white/10">
      <div className="animate-pulse">
        <div className="aspect-[4/3] bg-white/5" />
        <div className="p-5 space-y-3">
          <div className="h-3 bg-white/5 rounded-full w-20" />
          <div className="h-4 bg-white/5 rounded-full w-3/4" />
          <div className="h-3 bg-white/5 rounded-full w-full" />
          <div className="h-3 bg-white/5 rounded-full w-1/2" />
        </div>
      </div>
    </div>
  );
}

export default function ContentHubPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HubItem[]>([]);
  const [sourceFilter, setSourceFilter] = useState<ContentSourceAll>('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [reactionData, setReactionData] = useState<Record<string, ReactionData>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HubItem | null>(null);
  const [adminMode, setAdminMode] = useState(false);

  const isAdmin = (profile?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    if (!isSupabaseAvailable()) {
      setLoading(false);
      return;
    }
    fetchItems();
    if (profile?.id) fetchBookmarks();
  }, [profile?.id]);

  async function fetchItems() {
    if (!isSupabaseAvailable()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase!
        .from('content_hub_items')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(60);

      if (error) throw error;
      const list = (data as HubItem[]) || [];
      setItems(list);

      const ids = list.map(i => i.id);
      if (ids.length) {
        await Promise.all([fetchReactions(ids), fetchCommentCounts(ids)]);
      }
    } catch (e) {
      console.error('Error loading content hub:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReactions(ids: string[]) {
    const { data } = await supabase!
      .from('content_hub_reactions')
      .select('item_id,reaction,user_id')
      .in('item_id', ids);
    const map: Record<string, ReactionData> = {};
    for (const r of (data as any[]) || []) {
      if (!map[r.item_id]) map[r.item_id] = { counts: {}, mine: null };
      map[r.item_id].counts[r.reaction] = (map[r.item_id].counts[r.reaction] || 0) + 1;
      if (profile?.id && r.user_id === profile.id) map[r.item_id].mine = r.reaction;
    }
    setReactionData(map);
  }

  async function fetchCommentCounts(ids: string[]) {
    const { data } = await supabase!
      .from('content_hub_comments')
      .select('item_id')
      .in('item_id', ids);
    const counts: Record<string, number> = {};
    for (const r of (data as any[]) || []) counts[r.item_id] = (counts[r.item_id] || 0) + 1;
    setCommentCounts(counts);
  }

  async function fetchBookmarks() {
    if (!profile?.id) return;
    const { data } = await supabase!
      .from('content_hub_bookmarks')
      .select('item_id')
      .eq('user_id', profile.id);
    setBookmarks(new Set((data as any[])?.map(b => b.item_id) || []));
  }

  async function toggleBookmark(itemId: string) {
    if (!profile?.id) return;
    const isBookmarked = bookmarks.has(itemId);
    setBookmarks(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(itemId);
      else next.add(itemId);
      return next;
    });

    try {
      if (isBookmarked) {
        await supabase!.from('content_hub_bookmarks').delete().eq('item_id', itemId).eq('user_id', profile.id);
      } else {
        await supabase!.from('content_hub_bookmarks').insert({ item_id: itemId, user_id: profile.id });
      }
    } catch (e) {
      console.error('Bookmark error:', e);
      setBookmarks(prev => {
        const next = new Set(prev);
        if (isBookmarked) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
    }
  }

  async function handleReaction(itemId: string, emoji: string) {
    if (!profile?.id) return;
    const current = reactionData[itemId]?.mine;

    try {
      if (current === emoji) {
        await supabase!.from('content_hub_reactions').delete().eq('item_id', itemId).eq('user_id', profile.id);
        setReactionData(prev => {
          const next = { ...prev };
          if (next[itemId]) {
            next[itemId] = { ...next[itemId], mine: null, counts: { ...next[itemId].counts } };
            next[itemId].counts[emoji] = Math.max(0, (next[itemId].counts[emoji] || 0) - 1);
          }
          return next;
        });
      } else {
        if (current) {
          await supabase!.from('content_hub_reactions').update({ reaction: emoji }).eq('item_id', itemId).eq('user_id', profile.id);
        } else {
          await supabase!.from('content_hub_reactions').insert({ item_id: itemId, user_id: profile.id, reaction: emoji });
        }
        setReactionData(prev => {
          const next = { ...prev };
          if (!next[itemId]) next[itemId] = { counts: {}, mine: null };
          const counts = { ...next[itemId].counts };
          if (current && counts[current]) counts[current] = Math.max(0, counts[current] - 1);
          counts[emoji] = (counts[emoji] || 0) + 1;
          next[itemId] = { counts, mine: emoji };
          return next;
        });
      }
    } catch (e) {
      console.error('Reaction error:', e);
    }
  }

  async function syncYouTube() {
    if (!isSupabaseAvailable() || !isAdmin) return;
    setSyncing(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-content-hub`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'youtube', channelId: 'UC-_YourChannelId' }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        console.error('Sync failed:', resp.status, errBody);
        alert('Sync failed. Check console for details.');
      }
      await fetchItems();
    } catch (e) {
      console.error('Sync error:', e);
      alert('Sync error: ' + (e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function deleteItem(itemId: string) {
    if (!window.confirm('Delete this content item? This cannot be undone.')) return;
    if (!isSupabaseAvailable()) return;
    try {
      const { error } = await supabase!.from('content_hub_items').delete().eq('id', itemId);
      if (error) throw error;
      fetchItems();
    } catch (e) {
      console.error('Delete error:', e);
      alert('Failed to delete item');
    }
  }

  const filteredItems = useMemo(() => {
    let list = items;
    if (sourceFilter !== 'all') list = list.filter(i => i.source === sourceFilter);
    if (showFeaturedOnly) list = list.filter(i => i.is_featured);
    return list;
  }, [items, sourceFilter, showFeaturedOnly]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length, blog: 0, twitter: 0, instagram: 0, linkedin: 0, youtube: 0, facebook: 0 };
    for (const i of items) counts[i.source] = (counts[i.source] || 0) + 1;
    return counts;
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Studio"
        subtitle="All of Cody Wise & Wise Media's content — blog, X/Twitter, Instagram, YouTube, LinkedIn, and Facebook — in one native feed."
        action={isAdmin ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setEditingItem(null); setAdminModalOpen(true); }}
              className="btn-header-glass space-x-2"
            >
              <Plus size={16} className="text-[#3AA3EB]" />
              <span className="btn-text-glow">New Content</span>
            </button>
            <button
              onClick={() => setAdminMode(!adminMode)}
              className={`p-2.5 rounded-2xl border transition-all ${adminMode ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/40 text-[#3AA3EB]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
              title="Toggle admin edit mode"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={syncYouTube}
              disabled={syncing}
              className="p-2.5 rounded-2xl border bg-white/5 border-white/10 text-gray-400 hover:text-white disabled:opacity-50"
              title="Sync YouTube"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            </button>
          </div>
        ) : undefined}
      />

      {/* Source filter bar */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${sourceFilter === 'all'
              ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
          >
            All Sources <span className="ml-1 text-xs opacity-60">{sourceCounts.all}</span>
          </button>
          {(Object.keys(SOURCE_CONFIG) as ContentSource[]).map(src => {
            const cfg = SOURCE_CONFIG[src];
            const Icon = cfg.icon;
            return (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border flex items-center gap-2 ${sourceFilter === src
                  ? `${cfg.bg} ${cfg.color} border-current`
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
              >
                <Icon size={14} />
                {cfg.label}
                <span className="text-xs opacity-60">{sourceCounts[src] || 0}</span>
              </button>
            );
          })}
          <div className="ml-auto">
            <button
              onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border flex items-center gap-2 ${showFeaturedOnly
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
            >
              <Star size={14} className={showFeaturedOnly ? 'fill-yellow-400 text-yellow-400' : ''} />
              Featured
            </button>
          </div>
        </div>
      </div>

      {/* Content grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
          <Rss className="h-12 w-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            No content synced yet. {isAdmin ? 'Click "Sync Sources" to pull latest content.' : 'Check back soon.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map(item => {
            const isYouTube = item.source === 'youtube';
            const media = item.media_urls || [];
            const firstVideo = media.find(m => m.type === 'video');
            const reactions = reactionData[item.id]?.counts || {};
            const myReaction = reactionData[item.id]?.mine;
            const isBookmarked = bookmarks.has(item.id);
            const comments = commentCounts[item.id] || 0;
            const visible = !item.is_hidden || adminMode;
            if (!visible) return null;

            return (
              <div
                key={item.id}
                onClick={() => !adminMode && navigate(`/community/hub/${item.id}`)}
                className="ios-card group relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden cursor-pointer transition-all duration-300 hover:bg-white/[0.06] hover:border-white/15 hover:shadow-2xl hover:shadow-black/20 active:scale-[0.99]"
              >
                {/* Cover media */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#3AA3EB]/20 to-blue-600/10 flex items-center justify-center">
                      <FileText className="text-[#3AA3EB]" size={48} />
                    </div>
                  )}

                  {/* Top badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    <SourceBadge source={item.source} />
                    <div className="flex items-center gap-2">
                      {item.is_hidden && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-rose-500/80 backdrop-blur-md text-white uppercase tracking-wider">
                          <EyeOff size={10} /> Hidden
                        </span>
                      )}
                      {item.is_featured && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/80 backdrop-blur-md text-white uppercase tracking-wider">
                          <Star size={10} className="fill-white text-white" /> Featured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Admin overlay controls */}
                  {adminMode && isAdmin && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 z-10">
                      <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setAdminModalOpen(true); }}
                        className="p-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-2xl transition-all">
                        <Pencil size={18} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                        className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}

                  {/* YouTube play overlay */}
                  {isYouTube && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-red-600/80 backdrop-blur-md flex items-center justify-center border border-white/30">
                        <Play size={24} className="text-white ml-1" fill="white" />
                      </div>
                    </div>
                  )}

                  {/* Duration badge */}
                  {item.duration && (
                    <span className="absolute bottom-3 right-3 px-2 py-1 rounded-md text-[10px] font-bold bg-black/70 backdrop-blur-md text-white tabular-nums">
                      {item.duration}
                    </span>
                  )}
                </div>

                {/* Content body */}
                <div className="p-5 space-y-3">
                  {/* Author + date */}
                  <div className="flex items-center gap-2">
                    {item.author_avatar ? (
                      <img src={item.author_avatar} alt={item.author_name || ''} className="w-6 h-6 rounded-full object-cover" />
                    ) : item.author_name ? (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#3AA3EB] to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {item.author_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    ) : null}
                    <span className="text-gray-400 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {item.author_name || SOURCE_CONFIG[item.source].label}
                    </span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-500 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {formatAppDateTime(item.published_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-white font-bold text-base leading-snug line-clamp-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {item.title}
                  </h3>

                  {/* Excerpt */}
                  {item.description && (
                    <p className="text-gray-400 text-sm line-clamp-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {item.description}
                    </p>
                  )}

                  {/* Engagement bar */}
                  <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                    {/* Reactions */}
                    <div className="flex items-center gap-1">
                      {Object.entries(reactions).slice(0, 3).map(([emoji, count]) => (
                        <span key={emoji} className="flex items-center gap-0.5 text-xs text-gray-400">
                          {emoji} <span className="font-semibold">{count}</span>
                        </span>
                      ))}
                    </div>

                    <div className="ml-auto flex items-center gap-3 text-gray-500">
                      <span className="flex items-center gap-1 text-xs">
                        <MessageCircle size={14} /> {comments}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(item.id); }}
                        className={`hover:text-white transition-colors ${isBookmarked ? 'text-yellow-400' : ''}`}
                      >
                        <Bookmark size={14} className={isBookmarked ? 'fill-yellow-400' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ContentHubAdminModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onSaved={fetchItems}
        editingItem={editingItem}
      />
    </div>
  );
}
