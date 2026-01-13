import { useEffect, useMemo, useState, useRef } from 'react';
import { MessageCircle, ArrowRight, X, Trash2, Upload, Paperclip, Edit2, Plus } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { supabase, isSupabaseAvailable, UserRole } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatAppDateTime } from '../lib/dateFormat';

type FeedTag = 'General' | 'Design' | 'Dev' | 'Branding' | 'Wins' | 'Questions';
type Visibility = 'all' | 'pro';

interface PostAuthor {
  full_name: string | null;
  email?: string | null;
  avatar_url: string | null;
  role: UserRole;
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
const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🙌', '😮', '😢', '💯'];

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

const isVideoUrl = (url: string) => {
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.mov') ||
    lower.includes('youtube.com/watch') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com')
  );
};

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getVimeoId = (url: string) => {
  const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:\w+\/)?|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : null;
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
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [updating, setUpdating] = useState(false);

  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({});
  const [togglingReaction, setTogglingReaction] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'post' | 'comment';
    id: string;
    postId?: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = useMemo(() => {
    return (profile?.role || '').toLowerCase() === 'admin';
  }, [profile?.role]);

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
        setUserReactions({});
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
      .in('post_id', postIds);

    if (error) {
      console.error('Error loading reactions:', error);
      return;
    }

    const counts: Record<string, Record<string, number>> = {};
    const mine: Record<string, string> = {};

    for (const row of (data as any[]) || []) {
      if (!counts[row.post_id]) counts[row.post_id] = {};
      counts[row.post_id][row.reaction] = (counts[row.post_id][row.reaction] || 0) + 1;

      if (profile?.id && row.user_id === profile.id) {
        mine[row.post_id] = row.reaction;
      }
    }
    setReactionCounts(counts);
    setUserReactions(mine);
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

  async function handleReaction(postId: string, reaction: string) {
    if (!isSupabaseAvailable() || !profile?.id) return;
    if (togglingReaction[postId]) return;
    setTogglingReaction(prev => ({ ...prev, [postId]: true }));
    try {
      const currentReaction = userReactions[postId];

      // If clicking the same reaction, remove it
      if (currentReaction === reaction) {
        const { error } = await supabase!
          .from('community_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', profile.id)
          .eq('reaction', reaction);
        if (error) throw error;

        setUserReactions(prev => {
          const next = { ...prev };
          delete next[postId];
          return next;
        });
        setReactionCounts(prev => {
          const next = { ...prev };
          if (next[postId] && next[postId][reaction]) {
            next[postId] = { ...next[postId], [reaction]: Math.max(0, next[postId][reaction] - 1) };
          }
          return next;
        });
      } else {
        // If they had a different reaction, we need to update or delete/insert
        if (currentReaction) {
          // Update existing reaction
          const { error } = await supabase!
            .from('community_reactions')
            .update({ reaction })
            .eq('post_id', postId)
            .eq('user_id', profile.id);
          if (error) throw error;

          setUserReactions(prev => ({ ...prev, [postId]: reaction }));
          setReactionCounts(prev => {
            const next = { ...prev };
            if (next[postId]) {
              next[postId] = { ...next[postId] };
              if (next[postId][currentReaction]) {
                next[postId][currentReaction] = Math.max(0, next[postId][currentReaction] - 1);
              }
              next[postId][reaction] = (next[postId][reaction] || 0) + 1;
            }
            return next;
          });
        } else {
          // Insert new reaction
          const { error } = await supabase!
            .from('community_reactions')
            .insert({ post_id: postId, user_id: profile.id, reaction });
          if (error) throw error;

          setUserReactions(prev => ({ ...prev, [postId]: reaction }));
          setReactionCounts(prev => {
            const next = { ...prev };
            if (!next[postId]) next[postId] = {};
            next[postId] = { ...next[postId], [reaction]: (next[postId][reaction] || 0) + 1 };
            return next;
          });
        }
      }
    } catch (e) {
      console.error('Error handling reaction:', e);
    } finally {
      setTogglingReaction(prev => ({ ...prev, [postId]: false }));
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

  async function performDelete() {
    if (!itemToDelete || !isSupabaseAvailable() || !profile?.id) return;

    try {
      if (itemToDelete.type === 'post') {
        const { error } = await supabase!
          .from('community_posts')
          .delete()
          .eq('id', itemToDelete.id);

        if (error) throw error;
        setPosts(prev => prev.filter(p => p.id !== itemToDelete.id));
      } else if (itemToDelete.type === 'comment' && itemToDelete.postId) {
        const { error } = await supabase!
          .from('community_comments')
          .delete()
          .eq('id', itemToDelete.id);

        if (error) throw error;
        const postId = itemToDelete.postId;
        const commentId = itemToDelete.id;
        setCommentsByPost(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
        }));
        setCommentCounts(prev => ({
          ...prev,
          [postId]: Math.max(0, (prev[postId] || 1) - 1)
        }));
      }

      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (e) {
      console.error('Error deleting item:', e);
      alert(`Failed to delete ${itemToDelete.type}. Please try again.`);
    }
  }

  function confirmDeletePost(postId: string) {
    setItemToDelete({ type: 'post', id: postId });
    setIsDeleteModalOpen(true);
  }

  function confirmDeleteComment(postId: string, commentId: string) {
    setItemToDelete({ type: 'comment', id: commentId, postId });
    setIsDeleteModalOpen(true);
  }

  async function createPost() {
    if (!isSupabaseAvailable() || !profile?.id || !isAdmin) return;
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

  async function handleUpdatePost() {
    if (!editingPost || !isSupabaseAvailable() || !profile?.id) return;
    const body = editBody.trim();
    if (!body) return;

    setUpdating(true);
    try {
      const { error } = await supabase!
        .from('community_posts')
        .update({
          title: editTitle.trim() || null,
          body: body,
          content: body,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, title: editTitle.trim() || null, body, content: body } : p));
      setIsEditModalOpen(false);
      setEditingPost(null);
      setEditTitle('');
      setEditBody('');
    } catch (e) {
      console.error('Error updating post:', e);
      alert('Failed to update post.');
    } finally {
      setUpdating(false);
    }
  }

  const composerCanSelectPro = isPro;
  const visibilityOptions: { value: Visibility; label: string }[] = composerCanSelectPro
    ? [
      { value: 'all', label: 'All Creators' },
      { value: 'pro', label: 'Pro Creators only' },
    ]
    : [{ value: 'all', label: 'All Creators' }];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isSupabaseAvailable() || !profile?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase!.storage
        .from('community')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase!.storage
        .from('community')
        .getPublicUrl(filePath);

      const url = data.publicUrl;
      let type = 'link';
      if (isImageUrl(url)) type = 'image';
      else if (isVideoUrl(url)) type = 'video';

      setComposerAttachments(prev => [...prev, { type, url }]);
    } catch (e) {
      console.error('Error uploading file:', e);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addAttachment = () => {
    const url = composerAttachmentUrl.trim();
    if (!url) return;
    let type = 'link';
    if (isImageUrl(url)) type = 'image';
    else if (isVideoUrl(url)) type = 'video';

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
      {/* Header Section */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="min-w-0">
            <h1 className="text-4xl font-bold gradient-text text-[40px]" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Creator Club
            </h1>
            <p className="text-gray-400 mt-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Announcements, wins, questions, and creator-to-creator support.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setComposerOpen(true)}
              className="btn-header-glass space-x-2 shrink-0 w-full sm:w-auto"
            >
              <span className="btn-text-glow">New Post</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          )}

        </div>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag('All')}
              className={`px-3 py-2 rounded-lg text-sm transition-all border ${selectedTag === 'All'
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
                className={`px-3 py-2 rounded-lg text-sm transition-all border ${selectedTag === tag
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
              className={`px-3 py-2 rounded-lg text-sm transition-all border ${visibilityFilter === 'all'
                ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              All Posts
            </button>
            <button
              onClick={() => setVisibilityFilter('pro_only')}
              className={`px-3 py-2 rounded-lg text-sm transition-all border ${visibilityFilter === 'pro_only'
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
      </div>

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
            const reactions = reactionCounts[post.id] || {};
            const comments = commentCounts[post.id] || 0;
            const myReaction = userReactions[post.id];
            const attachments = Array.isArray(post.attachments) ? post.attachments : [];
            const postBody = post.body || post.content || '';

            return (
              <GlassCard key={post.id} className="p-6" disableHover>
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

                    {(isAdmin || post.user_id === profile?.id) && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingPost(post);
                            setEditTitle(post.title || '');
                            setEditBody(post.body || post.content || '');
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Edit Post"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => confirmDeletePost(post.id)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
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
                              className="w-full max-h-[420px] object-contain rounded-xl border border-white/10"
                            />
                          );
                        }

                        if (isVideoUrl(url)) {
                          const ytId = getYouTubeId(url);
                          const vimId = getVimeoId(url);

                          if (ytId) {
                            return (
                              <div key={`${post.id}-att-${idx}`} className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden border border-white/10">
                                <iframe
                                  src={`https://www.youtube.com/embed/${ytId}`}
                                  className="absolute top-0 left-0 w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            );
                          }

                          if (vimId) {
                            return (
                              <div key={`${post.id}-att-${idx}`} className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden border border-white/10">
                                <iframe
                                  src={`https://player.vimeo.com/video/${vimId}`}
                                  className="absolute top-0 left-0 w-full h-full"
                                  allow="autoplay; fullscreen; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            );
                          }

                          return (
                            <video
                              key={`${post.id}-att-${idx}`}
                              src={url}
                              controls
                              className="w-full max-h-[420px] rounded-xl border border-white/10"
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

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {/* Existing Reactions */}
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(reactions).map(([emoji, count]) => {
                        if (count === 0) return null;
                        const isMine = myReaction === emoji;
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(post.id, emoji)}
                            className={`px-2 py-1 rounded-full text-sm flex items-center gap-1.5 transition-all border ${isMine
                              ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                              }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-xs font-semibold">{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Add Reaction Picker Popover/Button */}
                    <div className="relative group/picker">
                      <button
                        className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                        title="Add reaction"
                      >
                        <Plus size={16} />
                      </button>

                      {/* Tooltip Content (Emoji Picker) */}
                      <div className="absolute bottom-full mb-2 left-0 opacity-0 invisible group-hover/picker:opacity-100 group-hover/picker:visible transition-all duration-200 z-50">
                        <div className="flex items-center gap-1 p-1 bg-[#1a1c1e] border border-white/10 rounded-full shadow-2xl backdrop-blur-xl">
                          {COMMON_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(post.id, emoji)}
                              className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-transform hover:scale-125 ${myReaction === emoji ? 'bg-[#3AA3EB]/20' : ''
                                }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="h-4 w-px bg-white/10 mx-1"></div>

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

                              {(isAdmin || comment.user_id === profile?.id) && (
                                <button
                                  onClick={() => confirmDeleteComment(post.id, comment.id)}
                                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors self-start"
                                  title="Delete Comment"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
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
                    className={`px-3 py-2 rounded-lg text-sm transition-all border ${active
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
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>Attachments</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sm text-[#3AA3EB] hover:text-[#2a92da] flex items-center gap-1.5 transition-colors"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                <Upload size={14} />
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={composerAttachmentUrl}
                onChange={(e) => setComposerAttachmentUrl(e.target.value)}
                className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
                placeholder="Paste Image/Video URL"
              />
              <button
                type="button"
                onClick={addAttachment}
                className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors font-medium"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
                disabled={!composerAttachmentUrl.trim()}
              >
                <Paperclip size={18} />
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

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPost(null);
          setEditTitle('');
          setEditBody('');
        }}
        title="Edit Post"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>Body</label>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
              placeholder="What's on your mind?"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingPost(null);
                setEditTitle('');
                setEditBody('');
              }}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors font-medium"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdatePost}
              disabled={updating || !editBody.trim()}
              className="px-4 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/50 text-white rounded-lg transition-colors font-medium"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={performDelete}
        title={`Delete ${itemToDelete?.type === 'post' ? 'Post' : 'Comment'}`}
        message={`Are you sure you want to delete this ${itemToDelete?.type}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}
