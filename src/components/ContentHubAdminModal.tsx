import { useState, useEffect } from 'react';
import { X, Save, Trash2, UploadCloud, Link2, Plus, FileText, Twitter, Instagram, Youtube, Linkedin, Facebook, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type ContentSource = 'blog' | 'linkedin' | 'youtube' | 'facebook' | 'twitter' | 'instagram';

export interface HubItem {
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

const SOURCE_OPTIONS: { value: ContentSource; label: string; icon: typeof FileText }[] = [
  { value: 'blog', label: 'Blog', icon: FileText },
  { value: 'twitter', label: 'X / Twitter', icon: Twitter },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
];

type FieldKey = 'title' | 'description' | 'body' | 'author_name' | 'cover_image_url' | 'category' | 'tags' | 'external_url';

const PLATFORM_FIELDS: Record<ContentSource, FieldKey[]> = {
  blog: ['title', 'description', 'body', 'cover_image_url', 'category', 'tags', 'author_name', 'external_url'],
  twitter: ['external_url'],
  instagram: ['external_url', 'cover_image_url'],
  youtube: ['external_url'],
  linkedin: ['external_url', 'title', 'description', 'author_name'],
  facebook: ['external_url', 'description', 'cover_image_url'],
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingItem?: HubItem | null;
}

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function ContentHubAdminModal({ isOpen, onClose, onSaved, editingItem }: Props) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    source: 'blog' as ContentSource,
    title: '',
    description: '',
    body: '',
    author_name: '',
    cover_image_url: '',
    category: '',
    tags: [] as string[],
    external_url: '',
    is_featured: false,
    is_hidden: false,
  });

  useEffect(() => {
    if (editingItem) {
      setForm({
        source: editingItem.source,
        title: editingItem.title || '',
        description: editingItem.description || '',
        body: editingItem.body || '',
        author_name: editingItem.author_name || '',
        cover_image_url: editingItem.cover_image_url || '',
        category: editingItem.category || '',
        tags: editingItem.tags || [],
        external_url: editingItem.external_url || '',
        is_featured: editingItem.is_featured || false,
        is_hidden: editingItem.is_hidden || false,
      });
    } else {
      setForm({
        source: 'blog', title: '', description: '', body: '', author_name: '',
        cover_image_url: '', category: '', tags: [], external_url: '',
        is_featured: false, is_hidden: false,
      });
    }
    setTagInput('');
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const visibleFields = PLATFORM_FIELDS[form.source];
  const show = (key: FieldKey) => visibleFields.includes(key);

  async function handleUploadImage(file: File) {
    if (!profile || !isSupabaseAvailable()) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `hub-${Date.now()}.${fileExt}`;
      const filePath = `content/${fileName}`;
      const { error: uploadError } = await supabase!.storage.from('content-hub')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase!.storage.from('content-hub').getPublicUrl(filePath);
      setForm(prev => ({ ...prev, cover_image_url: data.publicUrl }));
    } catch (e) {
      console.error('Upload error:', e);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  function addTag() {
    const tag = tagInput.trim().replace(/^#/, '');
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseAvailable()) return;
    // For link-based platforms, title is auto-derived; for blog/linkedin, require title
    if (show('title') && !form.title.trim()) return;
    // For link-only platforms, require external_url
    if (show('external_url') && !form.external_url.trim()) {
      alert('A link is required for this platform.');
      return;
    }
    setSaving(true);
    try {
      // Auto-derive title for link-only platforms
      let titleToSave = form.title.trim();
      if (!titleToSave && form.external_url) {
        if (form.source === 'twitter') titleToSave = 'X Post';
        else if (form.source === 'youtube') titleToSave = 'YouTube Video';
        else if (form.source === 'instagram') titleToSave = 'Instagram Post';
        else titleToSave = 'Post';
      }

      const payload = {
        source: form.source,
        external_id: editingItem?.external_id || `manual-${Date.now()}`,
        title: titleToSave,
        description: show('description') ? (form.description.trim() || null) : null,
        body: show('body') ? (form.body.trim() || null) : null,
        author_name: show('author_name') ? (form.author_name.trim() || null) : null,
        cover_image_url: show('cover_image_url') ? (form.cover_image_url.trim() || null) : null,
        category: show('category') ? (form.category.trim() || null) : null,
        tags: show('tags') ? form.tags : [],
        media_urls: form.cover_image_url ? [{ type: 'image', url: form.cover_image_url }] : [],
        external_url: form.external_url.trim() || null,
        is_featured: form.is_featured,
        is_hidden: form.is_hidden,
        published_at: editingItem?.published_at || new Date().toISOString(),
      };

      let error;
      if (editingItem) {
        ({ error } = await supabase!.from('content_hub_items').update(payload).eq('id', editingItem.id));
      } else {
        ({ error } = await supabase!.from('content_hub_items').insert([payload]));
      }
      if (error) throw error;
      onSaved();
      onClose();
    } catch (e) {
      console.error('Save error:', e);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingItem || !window.confirm('Delete this content item? This cannot be undone.')) return;
    if (!isSupabaseAvailable()) return;
    setSaving(true);
    try {
      const { error } = await supabase!.from('content_hub_items').delete().eq('id', editingItem.id);
      if (error) throw error;
      onSaved();
      onClose();
    } catch (e) {
      console.error('Delete error:', e);
      alert('Failed to delete content');
    } finally {
      setSaving(false);
    }
  }

  // Live embed preview
  const ytId = show('external_url') ? getYouTubeId(form.external_url) : null;
  const isTweet = form.source === 'twitter' && form.external_url;
  const isInsta = form.source === 'instagram' && form.external_url;
  const showEmbedPreview = ytId || isTweet || isInsta;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="ios-card rounded-3xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#1c1c1e]/95 backdrop-blur-xl z-10">
              <h3 className="text-white font-bold text-lg font-display uppercase tracking-wider">
                {editingItem ? 'Edit Content' : 'New Content'}
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Source selector */}
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2 font-body">Source</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {SOURCE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const active = form.source === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, source: opt.value }))}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all ${active
                          ? 'bg-[#3AA3EB]/15 border-[#3AA3EB]/40 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                      >
                        <Icon size={16} />
                        <span className="text-[10px] font-semibold font-body">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* External URL — shown for link-based platforms */}
              {show('external_url') && (
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2 font-body">
                    {form.source === 'twitter' ? 'Tweet URL' : form.source === 'youtube' ? 'YouTube Video URL' : form.source === 'instagram' ? 'Instagram Post URL' : form.source === 'linkedin' ? 'LinkedIn Post URL' : 'Post URL'}
                  </label>
                  <input
                    type="url"
                    value={form.external_url}
                    onChange={e => setForm(prev => ({ ...prev, external_url: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all font-body"
                    placeholder={
                      form.source === 'twitter' ? 'https://x.com/user/status/123...' :
                      form.source === 'youtube' ? 'https://youtube.com/watch?v=...' :
                      form.source === 'instagram' ? 'https://instagram.com/p/...' :
                      form.source === 'linkedin' ? 'https://linkedin.com/posts/...' :
                      'https://...'
                    }
                  />
                  {(form.source === 'twitter' || form.source === 'youtube' || form.source === 'instagram') && (
                    <p className="text-gray-500 text-xs mt-1.5 flex items-center gap-1.5 font-body">
                      <AlertCircle size={11} /> Just paste the link — it will render as an embedded card automatically.
                    </p>
                  )}
                </div>
              )}

              {/* Live embed preview */}
              {showEmbedPreview && (
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                  <p className="px-4 pt-3 text-gray-500 text-[10px] font-semibold uppercase tracking-widest font-body">Preview</p>
                  {ytId && (
                    <div className="p-3">
                      <div className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          className="absolute top-0 left-0 w-full h-full"
                          allowFullScreen
                          title="YouTube preview"
                        />
                      </div>
                    </div>
                  )}
                  {isTweet && !ytId && (
                    <a href={form.external_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors">
                      <div className="p-2 bg-black/40 rounded-xl flex-shrink-0">
                        <Twitter size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold font-body">X Post</p>
                        <p className="text-gray-500 text-xs truncate font-body">{form.external_url}</p>
                      </div>
                      <ExternalLink size={14} className="text-gray-500 flex-shrink-0" />
                    </a>
                  )}
                  {isInsta && !ytId && (
                    <a href={form.external_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors">
                      <div className="p-2 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl flex-shrink-0">
                        <Instagram size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold font-body">Instagram Post</p>
                        <p className="text-gray-500 text-xs truncate font-body">{form.external_url}</p>
                      </div>
                      <ExternalLink size={14} className="text-gray-500 flex-shrink-0" />
                    </a>
                  )}
                </div>
              )}

              {/* Title */}
              {show('title') && (
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2 font-body">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all font-body"
                    placeholder="Enter title or headline"
                  />
                </div>
              )}

              {/* Description */}
              {show('description') && (
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2 font-body">Description / Excerpt</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all h-20 resize-none font-body"
                    placeholder="Short excerpt or post text"
                  />
                </div>
              )}

              {/* Body (for blog posts) */}
              {show('body') && (
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2 font-body">Body (blog posts)</label>
                  <textarea
                    value={form.body}
                    onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all h-32 resize-none font-body"
                    placeholder="Full article body (for blog posts)"
                  />
                </div>
              )}

              {/* Author */}
              {show('author_name') && (
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2 font-body">Author Name</label>
                  <input
                    type="text"
                    value={form.author_name}
                    onChange={e => setForm(prev => ({ ...prev, author_name: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all font-body"
                    placeholder="e.g. Cody Wise"
                  />
                </div>
              )}

              {/* Category */}
              {show('category') && (
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2 font-body">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all font-body"
                    placeholder="e.g. Marketing"
                  />
                </div>
              )}

              {/* Cover image */}
              {show('cover_image_url') && (
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2 font-body">Cover Image</label>
                  <div className="flex items-center gap-3">
                    <input type="file" accept="image/*" className="hidden" id="hub-image-upload"
                      onChange={e => { const file = e.target.files?.[0]; if (file) handleUploadImage(file); }} />
                    <label htmlFor="hub-image-upload" className={`px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl cursor-pointer transition-all text-sm font-medium flex items-center gap-2 ${uploading ? 'opacity-50' : ''}`}>
                      <UploadCloud size={15} /> {uploading ? 'Uploading...' : 'Upload'}
                    </label>
                    <div className="flex-1 flex items-center gap-2">
                      <Link2 size={14} className="text-gray-500 flex-shrink-0" />
                      <input
                        type="url"
                        value={form.cover_image_url}
                        onChange={e => setForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
                        className="flex-1 px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all text-sm font-body"
                        placeholder="or paste image URL"
                      />
                    </div>
                  </div>
                  {form.cover_image_url && (
                    <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 max-h-40">
                      <img src={form.cover_image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {show('tags') && (
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2 font-body">Tags</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all text-sm font-body"
                      placeholder="Add tag and press Enter"
                    />
                    <button type="button" onClick={addTag} className="p-3 bg-white/10 hover:bg-white/15 rounded-2xl text-white transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3AA3EB]/15 border border-[#3AA3EB]/25 text-[#3AA3EB] text-xs font-medium font-body">
                          #{tag}
                          <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Flags */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer select-none font-body">
                  <input type="checkbox" checked={form.is_featured}
                    onChange={e => setForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                    className="accent-yellow-400 w-4 h-4" />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer select-none font-body">
                  <input type="checkbox" checked={form.is_hidden}
                    onChange={e => setForm(prev => ({ ...prev, is_hidden: e.target.checked }))}
                    className="accent-rose-400 w-4 h-4" />
                  Hidden
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-white/10">
                {editingItem && (
                  <button type="button" onClick={handleDelete} disabled={saving}
                    className="px-4 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-2xl transition-all disabled:opacity-50">
                    <Trash2 size={16} />
                  </button>
                )}
                <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-medium transition-all text-sm font-body">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3.5 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-2xl font-semibold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 font-body">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
