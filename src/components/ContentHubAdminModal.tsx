import { useState, useEffect } from 'react';
import { X, Save, Trash2, UploadCloud, Link2, Plus, FileText, Twitter, Instagram, Youtube, Linkedin, Facebook } from 'lucide-react';
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingItem?: HubItem | null;
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
    if (!isSupabaseAvailable() || !form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        source: form.source,
        external_id: editingItem?.external_id || `manual-${Date.now()}`,
        title: form.title.trim(),
        description: form.description.trim() || null,
        body: form.body.trim() || null,
        author_name: form.author_name.trim() || null,
        cover_image_url: form.cover_image_url.trim() || null,
        category: form.category.trim() || null,
        tags: form.tags,
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

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="ios-card rounded-3xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#1c1c1e]/95 backdrop-blur-xl z-10">
              <h3 className="text-white font-bold text-lg font-display">
                {editingItem ? 'Edit Content' : 'New Content'}
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Source selector */}
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Source</label>
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
                        <span className="text-[10px] font-semibold">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Title</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all"
                  placeholder="Enter title or headline"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Description / Excerpt</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all h-20 resize-none"
                  placeholder="Short excerpt or post text"
                />
              </div>

              {/* Body (for blog posts) */}
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Body (blog posts)</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all h-32 resize-none"
                  placeholder="Full article body (for blog posts)"
                />
              </div>

              {/* Author */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Author Name</label>
                  <input
                    type="text"
                    value={form.author_name}
                    onChange={e => setForm(prev => ({ ...prev, author_name: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all"
                    placeholder="e.g. Cody Wise"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all"
                    placeholder="e.g. Marketing"
                  />
                </div>
              </div>

              {/* Cover image */}
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Cover Image</label>
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
                      className="flex-1 px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all text-sm"
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

              {/* Tags */}
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Tags</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all text-sm"
                    placeholder="Add tag and press Enter"
                  />
                  <button type="button" onClick={addTag} className="p-3 bg-white/10 hover:bg-white/15 rounded-2xl text-white transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3AA3EB]/15 border border-[#3AA3EB]/25 text-[#3AA3EB] text-xs font-medium">
                        #{tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* External URL */}
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">External URL</label>
                <input
                  type="url"
                  value={form.external_url}
                  onChange={e => setForm(prev => ({ ...prev, external_url: e.target.value }))}
                  className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all"
                  placeholder="Link to original post (optional)"
                />
              </div>

              {/* Flags */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={form.is_featured}
                    onChange={e => setForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                    className="accent-yellow-400 w-4 h-4" />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer select-none">
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
                <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-medium transition-all text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3.5 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-2xl font-semibold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
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
