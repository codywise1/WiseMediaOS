import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Plus, X } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Modal from '../components/Modal';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatAppDateTime } from '../lib/dateFormat';

type FeedTag = 'General' | 'Design' | 'Dev' | 'Branding' | 'Wins' | 'Questions';
type Visibility = 'all' | 'pro';

interface PostAuthor {
  full_name: string | null;
  email?: string | null;
  avatar_url: string | null;
  role: string;
}

interface CommunityPost {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  content?: string | null;
  tags: string[];
  visibility: Visibility;
  attachments: any[];
  created_at: string;
  profiles?: PostAuthor;
}

interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  profiles?: PostAuthor;
}

type PostRow = Omit<CommunityPost, 'profiles'> & {
  profiles: PostAuthor | PostAuthor[] | null;
};

type CommentRow = Omit<CommunityComment, 'profiles'> & {
  profiles: PostAuthor | PostAuthor[] | null;
};

const TAGS: FeedTag[] = ['General', 'Design', 'Dev', 'Branding', 'Wins', 'Questions'];

const getInitials = (name?: string | null) => {
  const safe = (name || '').trim();
  if (!safe) return 'U';
  return safe
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
};

const getAuthorLabel = (author?: PostAuthor) => {
  const name = (author?.full_name || '').trim();
  if (name) return name;
  const email = (author?.email || '').trim();
  if (email) return email;
  return 'User';
};

const isImageUrl = (url: string) => {
  const lower = url.toLowerCase();
  return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
};

export default function CommunityFeedPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedTag, setSelectedTag] = useState<FeedTag | 'All'>('All');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'pro_only'>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerTags, setComposerTags] = useState<FeedTag[]>([]);
  const [composerVisibility, setComposerVisibility] = useState<Visibility>('all');
  const [composerAttachmentUrl, setComposerAttachmentUrl] = useState('');
  const [composerAttachments, setComposerAttachments] = useState<{ type: string; url: string }[]>([]);
  const [creating, setCreating] = useState(false);

  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({});
  const [togglingLike, setTogglingLike] = useState<Record<string, boolean>>({});

  const isPro = useMemo(() => {
    const role = (profile?.role || '').toLowerCase();
    const sub = (profile?.subscription_type || 'free').toLowerCase();
    return role === 'admin' || role === 'staff' || role === 'elite' || role === 'pro' || sub === 'pro';
  }, [profile?.role, profile?.subscription_type]);

  const canViewPost = (post: CommunityPost) => {
    if (post.visibility === 'all') return true;
    return isPro;
  };

  const visiblePosts = useMemo(() => {
    const filteredBySubscription = posts.filter(canViewPost);
    const filteredByTag = selectedTag === 'All'
      ? filteredBySubscription
      : filteredBySubscription.filter(p => (p.tags || []).some(tag => tag.toLowerCase() === selectedTag.toLowerCase()));
    if (visibilityFilter === 'pro_only') {
      return filteredByTag.filter(p => p.visibility === 'pro');
    }
    return filteredByTag;
  }, [posts, selectedTag, visibilityFilter, isPro]);

  useEffect(() => {
    if (!isSupabaseAvailable()) {
      setLoading(false);
      return;
    }
    fetchPosts();
  }, [profile?.id]);

  async function fetchPosts() {
    if (!isSupabaseAvailable()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase!
        .from('community_posts')
        .select('id,user_id,title,body,content,tags,visibility,attachments,created_at, profiles(full_name, email, avatar_url, role)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const rows = ((data as unknown) as PostRow[]) || [];
      const list: CommunityPost[] = rows.map(row => {
        const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          ...row,
          profiles: author || undefined,
          body: row.body ?? row.content ?? null,
        };
      });
      setPosts(list);

      const ids = list.map(p => p.id);
      if (ids.length) {
        await Promise.all([hydrateReactions(ids), hydrateCommentCounts(ids)]);
      } else {
        setReactionCounts({});
        setLikedByMe({});
        setCommentCounts({});
      }
    } catch (e) {
      console.error('Error loading community posts:', e);
    } finally {
      setLoading(false);
    }
  }

  async function hydrateReactions(postIds: string[]) {
    if (!isSupabaseAvailable()) return;
    const { data, error } = await supabase!
      .from('community_reactions')
      .select('post_id,user_id,reaction')
      .in('post_id', postIds)
      .eq('reaction', 'like');
    if (error) {
      console.error('Error loading reactions:', error);
      return;
    }

    const counts: Record<string, number> = {};
    const mine: Record<string, boolean> = {};
    for (const row of (data as any[]) || []) {
      counts[row.post_id] = (counts[row.post_id] || 0) + 1;
      if (profile?.id && row.user_id === profile.id) {
        mine[row.post_id] = true;
      }
    }
    setReactionCounts(counts);
    setLikedByMe(mine);
  }

  async function hydrateCommentCounts(postIds: string[]) {
    if (!isSupabaseAvailable()) return;
    const { data, error } = await supabase!
      .from('community_comments')
      .select('post_id')
      .in('post_id', postIds);
    if (error) {
      console.error('Error loading comment counts:', error);
      return;
    }
    const counts: Record<string, number> = {};
    for (const row of (data as any[]) || []) {
      counts[row.post_id] = (counts[row.post_id] || 0) + 1;
    }
    setCommentCounts(counts);
  }

  async function toggleLike(postId: string) {
    if (!isSupabaseAvailable() || !profile?.id) return;
    if (togglingLike[postId]) return;
    setTogglingLike(prev => ({ ...prev, [postId]: true }));
    try {
      const liked = !!likedByMe[postId];
      if (liked) {
        const { error } = await supabase!
          .from('community_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', profile.id)
          .eq('reaction', 'like');
        if (error) throw error;

        setLikedByMe(prev => ({ ...prev, [postId]: false }));
        setReactionCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 1) - 1) }));
      } else {
        const { error } = await supabase!
          .from('community_reactions')
          .insert({ post_id: postId, user_id: profile.id, reaction: 'like' });
        if (error) throw error;

        setLikedByMe(prev => ({ ...prev, [postId]: true }));
        setReactionCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      }
    } catch (e) {
      console.error('Error toggling reaction:', e);
    } finally {
      setTogglingLike(prev => ({ ...prev, [postId]: false }));
    }
  }

  async function toggleComments(postId: string) {
    const nextOpen = !openComments[postId];
    setOpenComments(prev => ({ ...prev, [postId]: nextOpen }));
    if (nextOpen && !commentsByPost[postId]) {
      await fetchComments(postId);
    }
  }

  async function fetchComments(postId: string) {
    if (!isSupabaseAvailable()) return;
    try {
      const { data, error } = await supabase!
        .from('community_comments')
        .select('id,post_id,user_id,body,parent_id,created_at, profiles(full_name, email, avatar_url, role)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = ((data as unknown) as CommentRow[]) || [];
      const normalized: CommunityComment[] = rows.map(row => {
        const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return { ...row, profiles: author || undefined };
      });
      setCommentsByPost(prev => ({ ...prev, [postId]: normalized }));
    } catch (e) {
      console.error('Error loading comments:', e);
    }
  }

  async function submitComment(postId: string) {
    if (!isSupabaseAvailable() || !profile?.id) return;
    const body = (commentDrafts[postId] || '').trim();
    if (!body) return;
    if (postingComment[postId]) return;

    setPostingComment(prev => ({ ...prev, [postId]: true }));
    try {
      const { error } = await supabase!
        .from('community_comments')
        .insert({ post_id: postId, user_id: profile.id, body });
      if (error) throw error;

      setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
      setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      await fetchComments(postId);
    } catch (e) {
      console.error('Error posting comment:', e);
    } finally {
      setPostingComment(prev => ({ ...prev, [postId]: false }));
    }
  }

  async function createPost() {
    if (!isSupabaseAvailable() || !profile?.id) return;
    const body = composerBody.trim();
    if (!body) return;

    setCreating(true);
    try {
      const payload = {
        user_id: profile.id,
        title: composerTitle.trim() || null,
        body,
        content: body,
        tags: composerTags,
        visibility: composerVisibility,
        attachments: composerAttachments,
      };

      const { error } = await supabase!.from('community_posts').insert(payload);
      if (error) throw error;

      setComposerOpen(false);
      setComposerTitle('');
      setComposerBody('');
      setComposerTags([]);
      setComposerVisibility('all');
      setComposerAttachmentUrl('');
      setComposerAttachments([]);
      await fetchPosts();
    } catch (e) {
      console.error('Error creating post:', e);
    } finally {
      setCreating(false);
    }
  }

  const composerCanSelectPro = isPro;
  const visibilityOptions: { value: Visibility; label: string }[] = composerCanSelectPro
    ? [
        { value: 'all', label: 'All Creators' },
        { value: 'pro', label: 'Pro Creators only' },
      ]
    : [{ value: 'all', label: 'All Creators' }];

  const addAttachment = () => {
    const url = composerAttachmentUrl.trim();
    if (!url) return;
    const type = isImageUrl(url) ? 'image' : 'link';
    setComposerAttachments(prev => [...prev, { type, url }]);
    setComposerAttachmentUrl('');
  };

  if (!isSupabaseAvailable()) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6 rounded-2xl border border-white/10">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
            Creator Club Feed
          </h1>
          <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Community Feed requires Supabase to be configured (database + RLS).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white text-[40px]" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Creator Club
          </h1>
          <p className="text-gray-400 mt-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Announcements, wins, questions, and creator-to-creator support.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setComposerOpen(true)}
            className="px-4 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl transition-colors font-medium shadow-lg flex items-center gap-2"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            <Plus size={18} />
            New Post
          </button>
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag('All')}
              className={`px-3 py-2 rounded-lg text-sm transition-all border ${
                selectedTag === 'All'
                  ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              All
            </button>
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-2 rounded-lg text-sm transition-all border ${
                  selectedTag === tag
                    ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="lg:ml-auto flex items-center gap-2">
            <button
              onClick={() => setVisibilityFilter('all')}
              className={`px-3 py-2 rounded-lg text-sm transition-all border ${
                visibilityFilter === 'all'
                  ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              All Posts
            </button>
            <button
              onClick={() => setVisibilityFilter('pro_only')}
              className={`px-3 py-2 rounded-lg text-sm transition-all border ${
                visibilityFilter === 'pro_only'
                  ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
              disabled={!isPro}
            >
              Pro Only
            </button>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <div className="glass-card p-6 rounded-2xl border border-white/10">
          <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Loading feed...
          </p>
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="glass-card p-6 rounded-2xl border border-white/10">
          <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            No posts yet. Be the first to post.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {visiblePosts.map(post => {
            const authorName = getAuthorLabel(post.profiles);
            const likes = reactionCounts[post.id] || 0;
            const comments = commentCounts[post.id] || 0;
            const liked = !!likedByMe[post.id];
            const attachments = Array.isArray(post.attachments) ? post.attachments : [];
            const postBody = post.body || post.content || '';

            return (
              <GlassCard key={post.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {post.profiles?.avatar_url ? (
                      <img
                        src={post.profiles.avatar_url}
                        alt={authorName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-[#3AA3EB] to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {getInitials(authorName)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-bold truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {authorName}
                        </p>
                        <span className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {formatAppDateTime(post.created_at)}
                        </span>
                        {post.visibility === 'pro' && (
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            PRO
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {(post.tags || []).slice(0, 5).map(tag => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {post.title && (
                    <h2 className="text-white font-bold text-xl" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                      {post.title}
                    </h2>
                  )}

                  <p className="text-gray-200 whitespace-pre-wrap" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    {postBody}
                  </p>

                  {attachments.length > 0 && (
                    <div className="space-y-3">
                      {attachments.map((att: any, idx: number) => {
                        const url = att?.url || att?.href || '';
                        if (!url) return null;
                        if (isImageUrl(url)) {
                          return (
                            <img
                              key={`${post.id}-att-${idx}`}
                              src={url}
                              alt="attachment"
                              className="w-full max-h-[420px] object-cover rounded-xl border border-white/10"
                            />
                          );
                        }
                        return (
                          <a
                            key={`${post.id}-att-${idx}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[#3AA3EB] transition-colors"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                          >
                            {url}
                          </a>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => toggleLike(post.id)}
                      disabled={!profile?.id || togglingLike[post.id]}
                      className={`px-3 py-2 rounded-lg transition-all border flex items-center gap-2 ${
                        liked
                          ? 'bg-red-500/15 border-red-500/30 text-red-200'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <Heart size={18} className={liked ? 'fill-red-400 text-red-400' : ''} />
                      {likes}
                    </button>

                    <button
                      onClick={() => toggleComments(post.id)}
                      className="px-3 py-2 rounded-lg transition-all border flex items-center gap-2 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <MessageCircle size={18} />
                      {comments}
                    </button>
                  </div>

                  {openComments[post.id] && (
                    <div className="pt-3 border-t border-white/10 space-y-4">
                      <div className="space-y-3">
                        {(commentsByPost[post.id] || []).map(comment => {
                          const name = getAuthorLabel(comment.profiles);
                          return (
                            <div key={comment.id} className="flex gap-3">
                              {comment.profiles?.avatar_url ? (
                                <img
                                  src={comment.profiles.avatar_url}
                                  alt={name}
                                  className="w-9 h-9 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-9 h-9 bg-gradient-to-br from-[#3AA3EB] to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                  {getInitials(name)}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="text-white font-semibold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    {name}
                                  </span>
                                  <span className="text-gray-500 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    {formatAppDateTime(comment.created_at)}
                                  </span>
                                </div>
                                <p className="text-gray-200 text-sm mt-1 whitespace-pre-wrap" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                  {comment.body}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentDrafts[post.id] || ''}
                          onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Write a comment..."
                          className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
                          style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
                        />
                        <button
                          onClick={() => submitComment(post.id)}
                          disabled={!profile?.id || postingComment[post.id] || !(commentDrafts[post.id] || '').trim()}
                          className="px-4 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/50 text-white rounded-lg transition-colors font-medium"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Create Post"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>Title</label>
            <input
              type="text"
              value={composerTitle}
              onChange={(e) => setComposerTitle(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>Body</label>
            <textarea
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
              placeholder="Share an update, ask a question, or drop a win..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => {
                const active = composerTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setComposerTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      );
                    }}
                    className={`px-3 py-2 rounded-lg text-sm transition-all border ${
                      active
                        ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>Visibility</label>
            <select
              value={composerVisibility}
              onChange={(e) => setComposerVisibility(e.target.value as Visibility)}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {visibilityOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>Attachments (URL)</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={composerAttachmentUrl}
                onChange={(e) => setComposerAttachmentUrl(e.target.value)}
                className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={addAttachment}
                className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors font-medium"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
                disabled={!composerAttachmentUrl.trim()}
              >
                Add
              </button>
            </div>
            {composerAttachments.length > 0 && (
              <div className="space-y-2">
                {composerAttachments.map((att, idx) => (
                  <div key={`${att.url}-${idx}`} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-sm text-gray-300 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{att.url}</span>
                    <button
                      type="button"
                      onClick={() => setComposerAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="ml-auto p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors font-medium"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createPost}
              disabled={creating || !composerBody.trim()}
              className="px-4 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/50 text-white rounded-lg transition-colors font-medium"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {creating ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
