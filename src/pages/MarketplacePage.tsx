import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { Star, Package, Zap, Users, Shield, FileText, LayoutGrid as Layout, Grid2x2 as Grid, Plus, X, CreditCard as Edit2, Trash2, EyeOff, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
}

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    old_price: '',
    category: 'templates',
    cover_image_url: '',
    platform: '',
    discount_enabled: false,
    affiliate_link: ''
  });
  const [downloadFiles, setDownloadFiles] = useState<DownloadFile[]>([]);

  useEffect(() => {
    fetchProducts();
    if (profile) setIsAdmin(profile.role === 'admin');
  }, [profile]);

  async function fetchProducts() {
    try {
      const dbProducts = supabase ? (await supabase
        .from('marketplace_products')
        .select('id, title, description, price, old_price, category, rating, reviews_count, cover_image_url, is_featured, discount_enabled, platform, is_hidden, status')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })).data || [] : [];
      const mockProducts: Product[] = [
        { id: 'mock-1', title: 'Premium Agency Notion OS', price: 49.99, old_price: 99.99, category: 'templates', rating: 5.0, reviews_count: 128, cover_image_url: '/src/media/marketplace_notion.png', is_featured: true, discount_enabled: true, platform: 'Notion' },
        { id: 'mock-2', title: 'Creator Contract Bundle', price: 149.00, old_price: 299.00, category: 'docs', rating: 4.9, reviews_count: 85, cover_image_url: '/src/media/marketplace_legal.png', is_featured: true, discount_enabled: true, platform: 'PDF/Word' },
        { id: 'mock-3', title: 'Vibrant Social Assets', price: 29.00, old_price: null, category: 'graphics', rating: 4.8, reviews_count: 56, cover_image_url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800', is_featured: false, discount_enabled: false, platform: 'Canva/Figma' },
        { id: 'mock-4', title: 'Scaling Playbook 2024', price: 79.00, old_price: 120.00, category: 'courses', rating: 5.0, reviews_count: 210, cover_image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800', is_featured: false, discount_enabled: true, platform: 'Digital Access' },
        { id: 'mock-5', title: 'Client CRM Toolkit', price: 39.00, old_price: null, category: 'toolkits', rating: 4.7, reviews_count: 42, cover_image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800', is_featured: false, discount_enabled: false, platform: 'Airtable' },
        { id: 'mock-6', title: 'Pitch Deck Master Template', price: 59.00, old_price: 89.00, category: 'templates', rating: 4.9, reviews_count: 73, cover_image_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800', is_featured: false, discount_enabled: true, platform: 'PowerPoint/Keynote' }
      ];
      setProducts([...mockProducts, ...dbProducts]);
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

  async function openEditModal(product: Product, e: React.MouseEvent) {
    e.stopPropagation();
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
      affiliate_link: (product as any).affiliate_link || ''
    });
    const rawFiles = (product as any).files || [];
    setDownloadFiles(Array.isArray(rawFiles) ? rawFiles.map((f: any) => ({
      id: f.id || `file-${Math.random()}`, name: f.name || 'Download', url: f.url || '', size: f.size, type: f.type || 'upload', file_type: f.file_type
    })) : []);
    setIsModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseAvailable()) return;
    setIsSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: parseFloat(form.price) || 0,
        old_price: form.old_price ? parseFloat(form.old_price) : null,
        category: form.category,
        cover_image_url: form.cover_image_url || null,
        platform: form.platform || null,
        discount_enabled: form.discount_enabled,
        affiliate_link: form.affiliate_link || null,
        files: downloadFiles,
        updated_at: new Date().toISOString()
      };
      if (editingProduct && !editingProduct.id.startsWith('mock-')) {
        const { error } = await supabase!.from('marketplace_products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase!.from('marketplace_products').insert([{
          ...payload,
          creator_id: profile?.id,
          rating: 0,
          reviews_count: 0,
          purchases_count: 0
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
    if (!deleteTarget || !isSupabaseAvailable() || deleteTarget.id.startsWith('mock-')) {
      setDeleteTarget(null);
      return;
    }
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
    if (!isSupabaseAvailable() || !isAdmin || product.id.startsWith('mock-')) return;
    try {
      const { error } = await supabase!.from('marketplace_products')
        .update({ is_featured: !product.is_featured, updated_at: new Date().toISOString() }).eq('id', product.id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured: !p.is_featured } : p));
    } catch (err) { console.error(err); }
  }

  async function toggleHide(product: Product, e: React.MouseEvent) {
    e.stopPropagation();
    if (!isSupabaseAvailable() || !isAdmin || product.id.startsWith('mock-')) return;
    try {
      const { error } = await supabase!.from('marketplace_products')
        .update({ is_hidden: !product.is_hidden, updated_at: new Date().toISOString() }).eq('id', product.id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_hidden: !p.is_hidden } : p));
    } catch (err) { console.error(err); }
  }

  function handleProductClick(productId: string) {
    navigate(`/community/marketplace/${productId}`);
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'all': return Grid;
      case 'templates': return Layout;
      case 'toolkits': return Package;
      case 'graphics': return Zap;
      case 'courses': return Users;
      case 'docs': return FileText;
      default: return Shield;
    }
  };

  const categories = [
    { id: 'all', label: 'All Products' },
    { id: 'templates', label: 'Templates' },
    { id: 'toolkits', label: 'Toolkits' },
    { id: 'graphics', label: 'Graphics' },
    { id: 'courses', label: 'Courses' },
    { id: 'docs', label: 'Documents' },
  ];

  const filteredProducts = selectedCategory === 'all'
    ? products.filter(p => !p.is_hidden || isAdmin)
    : products.filter(p => p.category === selectedCategory && (!p.is_hidden || isAdmin));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Marketplace"
        subtitle="Premium tools, templates, and resources to accelerate your growth."
        action={isAdmin ? (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#3AA3EB]/20"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            <Plus size={18} />
            Add Product
          </button>
        ) : undefined}
      />

      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${selectedCategory === cat.id
                ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white shadow-[0_0_15px_rgba(58,163,235,0.2)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                }`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="ios-card rounded-3xl overflow-hidden border border-white/10">
              <div className="animate-pulse space-y-3 p-4">
                <div className="aspect-[4/3] bg-white/5 rounded-2xl" />
                <div className="h-4 bg-white/5 rounded-full w-3/4" />
                <div className="h-3 bg-white/5 rounded-full w-1/2" />
                <div className="flex justify-between pt-2">
                  <div className="h-6 bg-white/5 rounded-full w-16" />
                  <div className="h-8 bg-white/5 rounded-xl w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
          <Package className="h-12 w-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-center" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            No products found in this category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const CategoryIcon = getCategoryIcon(product.category);
            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product.id)}
                className="ios-card group relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden cursor-pointer transition-all duration-300 hover:bg-white/[0.06] hover:border-white/15 hover:shadow-2xl hover:shadow-black/20 active:scale-[0.99]"
              >
                {/* Flush cover image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  {product.cover_image_url ? (
                    <img
                      src={product.cover_image_url}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#3AA3EB]/20 to-blue-600/10 flex items-center justify-center">
                      <CategoryIcon className="text-[#3AA3EB]" size={48} />
                    </div>
                  )}

                  {/* Badge pills — top row */}
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
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 backdrop-blur-md border border-red-500/40 text-red-300 uppercase tracking-wider">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>

                {/* Padded content section */}
                <div className="p-5 space-y-3">
                  {/* Category + rating row */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-300 capitalize" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      <CategoryIcon size={12} className="text-[#3AA3EB]" />
                      {product.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="text-yellow-400 fill-yellow-400" size={14} />
                      <span className="text-white text-sm font-bold" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                        {product.rating.toFixed(1)}
                      </span>
                      <span className="text-gray-500 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        ({product.reviews_count})
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-white font-bold text-base leading-snug line-clamp-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {product.title}
                  </h3>

                  {/* Platform */}
                  {product.platform && (
                    <p className="text-gray-400 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Built for {product.platform}
                    </p>
                  )}

                  {/* Price + action */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-baseline gap-2">
                      {product.discount_enabled && product.old_price && (
                        <span className="text-gray-500 line-through text-sm" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                          ${product.old_price.toFixed(2)}
                        </span>
                      )}
                      <span className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                        {product.price === 0 ? 'Free' : `${product.price.toFixed(2)}`}
                      </span>
                    </div>
                    <button className="px-4 py-2 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#3AA3EB]/20">
                      View
                    </button>
                  </div>
                </div>

                {/* Admin controls */}
                {isAdmin && !product.id.startsWith('mock-') && (
                  <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                      onClick={(e) => toggleFeatured(product, e)}
                      className={`p-2 rounded-full backdrop-blur-md transition-colors ${product.is_featured ? 'text-yellow-400 bg-yellow-400/20' : 'text-gray-400 bg-black/60 hover:text-white'}`}
                      title={product.is_featured ? 'Unfeature' : 'Feature'}
                    >
                      <Star size={14} />
                    </button>
                    <button
                      onClick={(e) => toggleHide(product, e)}
                      className={`p-2 rounded-full backdrop-blur-md transition-colors ${product.is_hidden ? 'text-red-400 bg-red-400/20' : 'text-gray-400 bg-black/60 hover:text-white'}`}
                      title={product.is_hidden ? 'Unhide' : 'Hide'}
                    >
                      {product.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={(e) => openEditModal(product, e)}
                      className="p-2 rounded-full backdrop-blur-md text-gray-400 bg-black/60 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(product); }}
                      className="p-2 rounded-full backdrop-blur-md text-gray-400 bg-black/60 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <GlassCard className="relative w-full max-w-lg bg-slate-900 border-white/10 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <h2 className="text-white font-bold text-xl uppercase tracking-wider" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Title</label>
                <input required type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all"
                  placeholder="Product title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Price ($)</label>
                  <input required type="number" step="0.01" value={form.price} onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all"
                    placeholder="49.99" />
                </div>
                <div className="space-y-2">
                  <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Old Price ($)</label>
                  <input type="number" step="0.01" value={form.old_price} onChange={e => setForm(prev => ({ ...prev, old_price: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all"
                    placeholder="99.99" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Category</label>
                  <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all">
                    <option value="templates">Templates</option>
                    <option value="toolkits">Toolkits</option>
                    <option value="graphics">Graphics</option>
                    <option value="courses">Courses</option>
                    <option value="docs">Documents</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Platform</label>
                  <input type="text" value={form.platform} onChange={e => setForm(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all"
                    placeholder="Notion, Figma, etc." />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Cover Image URL</label>
                <input type="url" value={form.cover_image_url} onChange={e => setForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all"
                  placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Description</label>
                <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all h-24"
                  placeholder="What is this product?" />
              </div>
              <DownloadUploader
                value={downloadFiles}
                onChange={setDownloadFiles}
                label="Downloadable Files"
                hint="Upload files buyers can download after purchase, or paste an external URL (e.g. another creator's product on Gumroad)."
              />
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Affiliate / External Buy Link (optional)</label>
                <input type="url" value={form.affiliate_link} onChange={e => setForm(prev => ({ ...prev, affiliate_link: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all"
                  placeholder="https://partner.com/buy" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.discount_enabled} onChange={e => setForm(prev => ({ ...prev, discount_enabled: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#3AA3EB]" />
                <span className="text-sm text-gray-300">Enable discount (old price shown with strikethrough)</span>
              </label>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all uppercase tracking-widest text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex-1 py-3 px-4 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#3AA3EB]/20 uppercase tracking-widest text-xs disabled:opacity-50">
                  {isSaving ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

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
}
