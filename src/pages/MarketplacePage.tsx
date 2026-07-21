import { useState, useEffect, useRef, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Star, Package, Zap, Users, Shield, FileText, LayoutGrid as Layout, Grid2x2 as Grid, Plus, X, CreditCard as Edit2, Trash2, EyeOff, Eye, MoreHorizontal, Search, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DownloadUploader, { DownloadFile } from '../components/DownloadUploader';

interface Product {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  category: string;
  rating: number;
  reviews_count: number;
  cover_image_url: string | null;
  is_featured: boolean;
  discount_enabled: boolean;
  platform: string | null;
  is_hidden?: boolean;
  status?: string;
  description?: string | null;
  affiliate_link?: string | null;
  files?: DownloadFile[];
}

const labelCls = 'block text-sm font-medium text-gray-300 mb-2';
const inputCls = 'form-input w-full px-4 py-3 rounded-xl text-sm';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'templates', label: 'Templates' },
  { id: 'toolkits', label: 'Toolkits' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'courses', label: 'Courses' },
  { id: 'docs', label: 'Documents' },
];

const CATEGORY_ICONS: Record<string, any> = {
  templates: Layout, toolkits: Package, graphics: Zap, courses: Users, docs: FileText, all: Grid,
};

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', price: '', old_price: '', category: 'templates',
    cover_image_url: '', platform: '', discount_enabled: false, affiliate_link: '',
  });
  const [downloadFiles, setDownloadFiles] = useState<DownloadFile[]>([]);

  useEffect(() => {
    fetchProducts();
    if (profile) setIsAdmin(profile.role === 'admin');
  }, [profile]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchProducts() {
    try {
      const dbProducts = supabase ? (await supabase
        .from('marketplace_products')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })).data || [] : [];
      setProducts(dbProducts as Product[]);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingProduct(null);
    setForm({ title: '', description: '', price: '', old_price: '', category: 'templates', cover_image_url: '', platform: '', discount_enabled: false, affiliate_link: '' });
    setDownloadFiles([]);
    setIsModalOpen(true);
  }

  function openEditModal(product: Product) {
    setMenuOpenId(null);
    setEditingProduct(product);
    setForm({
      title: product.title,
      description: product.description || '',
      price: String(product.price),
      old_price: product.old_price ? String(product.old_price) : '',
      category: product.category,
      cover_image_url: product.cover_image_url || '',
      platform: product.platform || '',
      discount_enabled: product.discount_enabled,
      affiliate_link: product.affiliate_link || '',
    });
    setDownloadFiles(Array.isArray(product.files) ? product.files.map((f: any) => ({
      id: f.id || `file-${Math.random()}`, name: f.name || 'Download', url: f.url || '', size: f.size, type: f.type || 'upload', file_type: f.file_type,
    })) : []);
    setIsModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseAvailable()) return;
    setIsSaving(true);
    try {
      const payload = {
        title: form.title, description: form.description,
        price: parseFloat(form.price) || 0, old_price: form.old_price ? parseFloat(form.old_price) : null,
        category: form.category, cover_image_url: form.cover_image_url || null,
        platform: form.platform || null, discount_enabled: form.discount_enabled,
        affiliate_link: form.affiliate_link || null, files: downloadFiles,
        updated_at: new Date().toISOString(),
      };
      if (editingProduct) {
        const { error } = await supabase!.from('marketplace_products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase!.from('marketplace_products').insert([{
          ...payload, creator_id: profile?.id, rating: 0, reviews_count: 0, purchases_count: 0,
        }]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProduct() {
    if (!deleteTarget || !isSupabaseAvailable()) { setDeleteTarget(null); return; }
    try {
      const { error } = await supabase!.from('marketplace_products').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function toggleFeatured(product: Product, e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpenId(null);
    if (!isSupabaseAvailable() || !isAdmin) return;
    try {
      const { error } = await supabase!.from('marketplace_products')
        .update({ is_featured: !product.is_featured, updated_at: new Date().toISOString() }).eq('id', product.id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured: !p.is_featured } : p));
    } catch (err) { console.error(err); }
  }

  async function toggleHide(product: Product, e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpenId(null);
    if (!isSupabaseAvailable() || !isAdmin) return;
    try {
      const { error } = await supabase!.from('marketplace_products')
        .update({ is_hidden: !product.is_hidden, updated_at: new Date().toISOString() }).eq('id', product.id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_hidden: !p.is_hidden } : p));
    } catch (err) { console.error(err); }
  }

  async function saveInlineTitle(product: Product) {
    if (!isSupabaseAvailable() || !inlineTitle.trim()) { setInlineEditId(null); return; }
    try {
      const { error } = await supabase!.from('marketplace_products')
        .update({ title: inlineTitle.trim(), updated_at: new Date().toISOString() }).eq('id', product.id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, title: inlineTitle.trim() } : p));
    } catch (err) { console.error(err); }
    setInlineEditId(null);
  }

  const filteredProducts = useMemo(() => {
    let result = selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory);
    if (!isAdmin) result = result.filter(p => !p.is_hidden);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.platform || '').toLowerCase().includes(q));
    }
    return result;
  }, [products, selectedCategory, searchQuery, isAdmin]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        subtitle="Premium tools, templates, and resources to accelerate your growth."
        action={isAdmin ? (
          <button onClick={openCreateModal} className="btn-wise">
            <Plus size={18} /> Add Product
          </button>
        ) : undefined}
      />

      {/* Search + Category filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="form-input w-full pl-11 pr-4 py-3 rounded-2xl text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10">
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>
        <div className="ios-segmented w-full overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
              className={`ios-segmented-btn flex-1 ${selectedCategory === cat.id ? 'active' : ''}`}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="ios-card rounded-2xl overflow-hidden border border-white/10">
              <div className="animate-pulse">
                <div className="aspect-[4/3] bg-white/5" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-white/5 rounded-full w-3/4" />
                  <div className="h-3 bg-white/5 rounded-full w-1/2" />
                  <div className="flex justify-between pt-2">
                    <div className="h-6 bg-white/5 rounded-full w-16" />
                    <div className="h-8 bg-white/5 rounded-xl w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="ios-card rounded-2xl p-12 text-center border border-white/10">
          <Package className="h-12 w-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">{searchQuery ? 'No products match your search.' : 'No products found in this category.'}</p>
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-[#3aa3eb] text-sm mt-2 font-medium">Clear search</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredProducts.map((product, idx) => {
              const CategoryIcon = CATEGORY_ICONS[product.category] || Shield;
              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
                  onClick={() => inlineEditId !== product.id && handleProductClick(product.id)}
                  className="ios-card group relative rounded-2xl border border-white/10 overflow-hidden cursor-pointer active:scale-[0.99]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {product.cover_image_url ? (
                      <img src={product.cover_image_url} alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#3AA3EB]/20 to-blue-600/10 flex items-center justify-center">
                        <CategoryIcon className="text-[#3AA3EB]" size={48} />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {product.is_featured && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 backdrop-blur-md border border-yellow-500/40 text-yellow-300 uppercase tracking-wider">
                            <Star size={10} className="fill-yellow-400 text-yellow-400" /> Featured
                          </span>
                        )}
                        {product.discount_enabled && product.old_price && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/90 backdrop-blur-md text-white uppercase tracking-wider">
                            {Math.round(((product.old_price - product.price) / product.old_price) * 100)}% Off
                          </span>
                        )}
                      </div>
                      {product.is_hidden && isAdmin && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 backdrop-blur-md border border-red-500/40 text-red-300 uppercase tracking-wider">Hidden</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-300 capitalize">
                        <CategoryIcon size={12} className="text-[#3AA3EB]" />
                        {product.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="text-yellow-400 fill-yellow-400" size={14} />
                        <span className="text-white text-sm font-bold">{product.rating.toFixed(1)}</span>
                        <span className="text-gray-500 text-xs">({product.reviews_count})</span>
                      </div>
                    </div>

                    {/* Inline-editable title for admin */}
                    {inlineEditId === product.id ? (
                      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={inlineTitle}
                          onChange={(e) => setInlineTitle(e.target.value)}
                          onBlur={() => saveInlineTitle(product)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveInlineTitle(product); if (e.key === 'Escape') setInlineEditId(null); }}
                          className="form-input flex-1 px-3 py-2 rounded-lg text-sm font-bold text-white"
                        />
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5">
                        <h3 className="text-white font-bold text-base leading-snug line-clamp-2 flex-1">{product.title}</h3>
                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setInlineEditId(product.id); setInlineTitle(product.title); }}
                            className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors shrink-0"
                            title="Quick edit title"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>
                    )}

                    {product.platform && <p className="text-gray-400 text-xs">Built for {product.platform}</p>}

                    <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                      <div className="flex items-baseline gap-2">
                        {product.discount_enabled && product.old_price && (
                          <span className="text-gray-500 line-through text-sm">${product.old_price.toFixed(2)}</span>
                        )}
                        <span className="text-2xl font-bold text-white tracking-tight">
                          {product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`}
                        </span>
                      </div>
                      <span className="px-4 py-2 bg-[#3AA3EB] text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#3AA3EB]/20">
                        View
                      </span>
                    </div>
                  </div>

                  {/* Admin overflow menu */}
                  {isAdmin && (
                    <div className="absolute top-3 right-3" ref={menuOpenId === product.id ? menuRef : null}>
                      {menuOpenId === product.id ? (
                        <div className="ios-card rounded-xl border border-white/15 overflow-hidden py-1 min-w-[160px] shadow-2xl z-20">
                          <button onClick={(e) => toggleFeatured(product, e)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-gray-200 hover:bg-white/10">
                            <Star size={13} className={product.is_featured ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'} />
                            {product.is_featured ? 'Unfeature' : 'Feature'}
                          </button>
                          <button onClick={(e) => toggleHide(product, e)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-gray-200 hover:bg-white/10">
                            {product.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                            {product.is_hidden ? 'Unhide' : 'Hide'}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openEditModal(product); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-gray-200 hover:bg-white/10">
                            <Edit2 size={13} /> Edit Details
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setDeleteTarget(product); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10">
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(product.id); }}
                          className="p-2 rounded-full bg-black/50 backdrop-blur-md text-gray-300 hover:text-white hover:bg-black/70 transition-colors"
                          title="More">
                          <MoreHorizontal size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Product Modal — uses base Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" form="product-form" disabled={isSaving} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSaveProduct} className="space-y-5">
          <div>
            <label className={labelCls}>Title</label>
            <input required type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className={inputCls} placeholder="Product title" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Price ($)</label>
              <input required type="number" step="0.01" value={form.price} onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                className={inputCls} placeholder="49.99" />
            </div>
            <div>
              <label className={labelCls}>Old Price ($)</label>
              <input type="number" step="0.01" value={form.old_price} onChange={e => setForm(prev => ({ ...prev, old_price: e.target.value }))}
                className={inputCls} placeholder="99.99" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className={inputCls}>
                <option value="templates">Templates</option>
                <option value="toolkits">Toolkits</option>
                <option value="graphics">Graphics</option>
                <option value="courses">Courses</option>
                <option value="docs">Documents</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform</label>
              <input type="text" value={form.platform} onChange={e => setForm(prev => ({ ...prev, platform: e.target.value }))}
                className={inputCls} placeholder="Notion, Figma, etc." />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cover Image URL</label>
            <input type="url" value={form.cover_image_url} onChange={e => setForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
              className={inputCls} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className={`${inputCls} h-24 resize-none`} placeholder="What is this product?" />
          </div>
          <DownloadUploader
            value={downloadFiles}
            onChange={setDownloadFiles}
            label="Downloadable Files"
            hint="Upload files buyers can download after purchase, or paste an external URL."
          />
          <div>
            <label className={labelCls}>Affiliate / External Buy Link (optional)</label>
            <input type="url" value={form.affiliate_link} onChange={e => setForm(prev => ({ ...prev, affiliate_link: e.target.value }))}
              className={inputCls} placeholder="https://partner.com/buy" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.discount_enabled} onChange={e => setForm(prev => ({ ...prev, discount_enabled: e.target.checked }))}
              className="w-4 h-4 rounded accent-[#3AA3EB]" />
            <span className="text-sm text-gray-300">Enable discount (old price shown with strikethrough)</span>
          </label>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteProduct}
          title="Delete Product"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmText="Delete"
        />
      )}
    </div>
  );

  function handleProductClick(productId: string) {
    navigate(`/community/marketplace/${productId}`);
  }
}
