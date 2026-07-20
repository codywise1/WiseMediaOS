import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Rss, Youtube, Linkedin, Facebook, FileText, Star,
  MessageCircle, Bookmark, Clock, Eye, ExternalLink, Send, Trash2, Twitter, Instagram,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import NativeVideoPlayer from '../components/NativeVideoPlayer';
import { supabase, isSupabaseAvailable, UserRole } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatAppDateTime } from '../lib/dateFormat';

type ContentSource = 'blog' | 'linkedin' | 'youtube' | 'facebook' | 'twitter' | 'instagram';

interface HubItem {
  id: string;
  source: ContentSource;
  external_id: string;
  title: string;
  description: string | null;
  body: string | null;
  author_name: string | null;
  author_avatar: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[];
  media_urls: { type: string; url: string }[];
  external_url: string | null;
  published_at: string;
  duration: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_featured: boolean;
  is_hidden: boolean;
}

interface Comment {
  id: string;
  item_id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email?: string | null; avatar_url: string | null; role: UserRole };
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

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getInitials(name?: string | null) {
  const safe = (name || '').trim();
  if (!safe) return 'U';
  return safe.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
}

export default function ContentHubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<HubItem | null>(null);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !isSupabaseAvailable()) {
      setLoading(false);
      return;
    }
    fetchItem();
    fetchComments();
    if (profile?.id) fetchBookmarkStatus();
  }, [id, profile?.id]);

  async function fetchItem() {
    try {
      const { data, error } = await supabase!
        .from('content_hub_items')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      setItem(data as HubItem);

      if (data) {
        const { data: reactData } = await supabase!
          .from('content_hub_reactions')
          .select('reaction,user_id')
          .eq('item_id', id!);
        const counts: Record<string, number> = {};
        let mine: string | null = null;
        for (const r of (reactData as any[]) || []) {
          counts[r.reaction] = (counts[r.reaction] || 0) + 1;
          if (profile?.id && r.user_id === profile.id) mine = r.reaction;
        }
        setReactions(counts);
        setMyReaction(mine);
      }
    } catch (e) {
      console.error('Error loading item:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    try {
      const { data, error } = await supabase!
        .from('content_hub_comments')
        .select('id,item_id,user_id,body,parent_id,created_at, profiles(full_name,email,avatar_url,role)')
        .eq('item_id', id!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setComments((data as Comment[]) || []);
    } catch (e) {
      console.error('Error loading comments:', e);
    }
  }

  async function fetchBookmarkStatus() {
    const { data } = await supabase!
      .from('content_hub_bookmarks')
      .select('id')
      .eq('item_id', id!)
      .eq('user_id', profile!.id)
      .maybeSingle();
    setIsBookmarked(!!data);
  }

  async function handleReaction(emoji: string) {
    if (!profile?.id) return;
    try {
      if (myReaction === emoji) {
        await supabase!.from('content_hub_reactions').delete().eq('item_id', id!).eq('user_id', profile.id);
        setReactions(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }));
        setMyReaction(null);
      } else {
        if (myReaction) {
          await supabase!.from('content_hub_reactions').update({ reaction: emoji }).eq('item_id', id!).eq('user_id', profile.id);
          setReactions(prev => ({
            ...prev,
            [myReaction]: Math.max(0, (prev[myReaction] || 0) - 1),
            [emoji]: (prev[emoji] || 0) + 1,
          }));
        } else {
          await supabase!.from('content_hub_reactions').insert({ item_id: id!, user_id: profile.id, reaction: emoji });
          setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
        }
        setMyReaction(emoji);
      }
    } catch (e) {
      console.error('Reaction error:', e);
    }
  }

  async function toggleBookmark() {
    if (!profile?.id) return;
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);
    try {
      if (wasBookmarked) {
        await supabase!.from('content_hub_bookmarks').delete().eq('item_id', id!).eq('user_id', profile.id);
      } else {
        await supabase!.from('content_hub_bookmarks').insert({ item_id: id!, user_id: profile.id });
      }
    } catch (e) {
      setIsBookmarked(wasBookmarked);
    }
  }

  async function submitComment() {
    if (!profile?.id || !commentDraft.trim()) return;
    setPosting(true);
    try {
      const { data, error } = await supabase!
        .from('content_hub_comments')
        .insert({ item_id: id!, user_id: profile.id, body: commentDraft.trim() })
        .select('id,item_id,user_id,body,parent_id,created_at, profiles(full_name,email,avatar_url,role)')
        .single();
      if (error) throw error;
      setComments(prev => [...prev, data as Comment]);
      setCommentDraft('');
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      console.error('Comment error:', e);
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(commentId: string) {
    try {
      await supabase!.from('content_hub_comments').delete().eq('id', commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) {
      console.error('Delete comment error:', e);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="ios-card rounded-3xl p-8 animate-pulse">
          <div className="h-8 bg-white/5 rounded-full w-1/3 mb-4" />
          <div className="aspect-video bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6">
        <PageHeader title="Content Not Found" subtitle="This content may have been removed." />
        <button onClick={() => navigate('/community/hub')} className="btn-header-glass">
          <ArrowLeft size={16} /> Back to Hub
        </button>
      </div>
    );
  }

  const cfg = SOURCE_CONFIG[item.source];
  const SourceIcon = cfg.icon;
  const isYouTube = item.source === 'youtube';
  const ytId = isYouTube ? getYouTubeId(item.external_url || '') : null;
  const media = item.media_urls || [];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/community/hub')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        style={{ fontFamily: 'Montserrat, sans-serif' }}
      >
        <ArrowLeft size={18} /> Back to Content Studio
      </button>

      <div className="ios-card rounded-3xl border border-white/10 overflow-hidden">
        {/* Hero media */}
        {isYouTube && ytId ? (
          <NativeVideoPlayer
            src={`https://www.youtube.com/embed/${ytId}`}
            poster={item.cover_image_url || undefined}
            title={item.title}
          />
        ) : item.cover_image_url ? (
          <div className="aspect-video overflow-hidden">
            <img src={item.cover_image_url} alt={item.title} className="w-full h-full object-cover" />
          </div>
        ) : null}

        {/* Content */}
        <div className="p-6 lg:p-8 space-y-5">
          {/* Source + meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} uppercase tracking-wider`}>
              <SourceIcon size={14} />
              {cfg.label}
            </span>
            {item.is_featured && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 uppercase tracking-wider">
                <Star size={12} className="fill-yellow-400 text-yellow-400" /> Featured
              </span>
            )}
            {item.category && (
              <span className="text-gray-400 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                {item.category}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-white font-bold text-2xl lg:text-3xl leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {item.title}
          </h1>

          {/* Author + date + stats */}
          <div className="flex items-center gap-4 flex-wrap text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <div className="flex items-center gap-2">
              {item.author_avatar ? (
                <img src={item.author_avatar} alt={item.author_name || ''} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3AA3EB] to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(item.author_name)}
                </div>
              )}
              <span className="text-white font-medium">{item.author_name || cfg.label}</span>
            </div>
            <span className="text-gray-600">·</span>
            <span>{formatAppDateTime(item.published_at)}</span>
            {item.duration && (
              <>
                <span className="text-gray-600">·</span>
                <span className="flex items-center gap-1"><Clock size={14} /> {item.duration}</span>
              </>
            )}
            {item.view_count > 0 && (
              <>
                <span className="text-gray-600">·</span>
                <span className="flex items-center gap-1"><Eye size={14} /> {item.view_count.toLocaleString()} views</span>
              </>
            )}
          </div>

          {/* Body */}
          {item.body && (
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-200 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                {item.body}
              </p>
            </div>
          )}

          {/* Media gallery */}
          {media.length > 0 && !isYouTube && (
            <div className="grid grid-cols-2 gap-3">
              {media.map((m, idx) => {
                if (m.type === 'image') {
                  return <img key={idx} src={m.url} alt="" className="rounded-xl border border-white/10 w-full" />;
                }
                if (m.type === 'video') {
                  const vid = getYouTubeId(m.url);
                  if (vid) {
                    return (
                      <div key={idx} className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden border border-white/10 col-span-2">
                        <iframe src={`https://www.youtube.com/embed/${vid}`} className="absolute top-0 left-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    );
                  }
                  return <video key={idx} src={m.url} controls className="rounded-xl border border-white/10 w-full col-span-2" />;
                }
                return (
                  <a key={idx} href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[#3AA3EB] transition-colors col-span-2">
                    <ExternalLink size={16} /> {m.url}
                  </a>
                );
              })}
            </div>
          )}

          {/* External link */}
          {item.external_url && (
            <a
              href={item.external_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#3AA3EB] hover:text-[#2a92da] transition-colors"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              <ExternalLink size={14} /> View original on {cfg.label}
            </a>
          )}

          {/* Engagement bar */}
          <div className="flex items-center gap-3 pt-5 border-t border-white/10">
            {/* Reactions */}
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(reactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all border ${myReaction === emoji
                    ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                >
                  <span>{emoji}</span>
                  <span className="text-xs font-semibold">{count}</span>
                </button>
              ))}

              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-3 py-1.5 rounded-full text-sm bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-all"
                >
                  + React
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 left-0 z-50">
                    <div className="flex items-center gap-1 p-2 bg-[#1a1c1e] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl">
                      {COMMON_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => { handleReaction(emoji); setShowEmojiPicker(false); }}
                          className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-transform hover:scale-125 ${myReaction === emoji ? 'bg-[#3AA3EB]/20' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                <MessageCircle size={16} /> {comments.length}
              </span>
              <button
                onClick={toggleBookmark}
                className={`p-2 rounded-lg transition-colors ${isBookmarked ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                <Bookmark size={18} className={isBookmarked ? 'fill-yellow-400' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments section */}
      <div className="ios-card rounded-3xl border border-white/10 p-6 lg:p-8">
        <h2 className="text-white font-bold text-lg mb-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Discussion ({comments.length})
        </h2>

        <div className="space-y-4 mb-6">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              No discussion yet. Start the conversation.
            </p>
          ) : (
            comments.map(comment => {
              const name = comment.profiles?.full_name || comment.profiles?.email || 'User';
              return (
                <div key={comment.id} className="flex gap-3">
                  {comment.profiles?.avatar_url ? (
                    <img src={comment.profiles.avatar_url} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3AA3EB] to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {getInitials(name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{name}</span>
                      <span className="text-gray-500 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>{formatAppDateTime(comment.created_at)}</span>
                    </div>
                    <p className="text-gray-200 text-sm mt-1 whitespace-pre-wrap" style={{ fontFamily: 'Montserrat, sans-serif' }}>{comment.body}</p>
                  </div>
                  {(comment.user_id === profile?.id || (profile?.role || '').toLowerCase() === 'admin') && (
                    <button onClick={() => deleteComment(comment.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors self-start">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={commentsEndRef} />
        </div>

        {profile?.id ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              placeholder="Join the discussion..."
              className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none transition-all"
              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
            />
            <button
              onClick={submitComment}
              disabled={posting || !commentDraft.trim()}
              className="px-5 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/50 text-white rounded-2xl transition-all font-medium flex items-center gap-2"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              <Send size={18} />
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Sign in to join the discussion.
          </p>
        )}
      </div>
    </div>
  );
}
