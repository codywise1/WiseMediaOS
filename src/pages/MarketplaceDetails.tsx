import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import DownloadUploader, { DownloadFile } from '../components/DownloadUploader';
import { Star, Download, ShoppingCart, Check, X, Shield, ArrowRight, ChevronLeft, ChevronRight, Package, Users, Zap, Lock, Clock, Headphones, CreditCard as Edit2, Trash2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  old_price: number | null;
  category: string;
  rating: number;
  reviews_count: number;
  purchases_count: number;
  cover_image_url: string | null;
  preview_images: string[];
  included_files: any[];
  tags: string[];
  platform: string | null;
  is_featured: boolean;
  discount_enabled: boolean;
  affiliate_link?: string | null;
  files?: { id: string; name: string; url: string; type: 'upload' | 'url'; size?: number }[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  is_verified_buyer: boolean;
  created_at: string;
  user_id: string;
  profiles: { full_name: string };
}

const TRUST_FEATURES = [
  { label: 'Lifetime Access', icon: Lock },
  { label: 'Instant Download', icon: Clock },
  { label: 'Personal License', icon: Check },
  { label: 'Premium Support', icon: Headphones },
];

const labelCls = 'block text-sm font-medium text-gray-300 mb-2';
const inputCls = 'form-input w-full px-4 py-3 rounded-xl text-sm';

export default function MarketplaceDetails() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { setCurrentPage } = useNavigation();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '', description: '', price: '', old_price: '', category: 'templates',
    cover_image_url: '', platform: '', discount_enabled: false, affiliate_link: '',
  });
  const [editFiles, setEditFiles] = useState<DownloadFile[]>([]);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (id) fetchProductData();
  }, [id, profile]);

  async function fetchProductData() {
    if (!id) return;
    try {
      const { data: productData } = await supabase!
        .from('marketplace_products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (productData) {
        setProduct(productData);
        const { data: reviewsData } = await supabase!
          .from('product_reviews')
          .select('*, profiles(full_name)')
          .eq('product_id', id)
          .order('created_at', { ascending: false });
        if (reviewsData) setReviews(reviewsData);

        const { data: relatedData } = await supabase!
          .from('marketplace_products')
          .select('*')
          .eq('category', productData.category)
          .neq('id', id)
          .limit(4);
        if (relatedData) setRelatedProducts(relatedData);
      }

      if (profile) {
        const { data: purchaseData } = await supabase!
          .from('product_purchases')
          .select('id')
          .eq('product_id', id)
          .eq('user_id', profile.id)
          .single();
        setHasPurchased(!!purchaseData);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase() {
    if (!profile || !product) return;
    try {
      const { error } = await supabase!.from('product_purchases').insert({
        product_id: product.id, user_id: profile.id, amount_paid: product.price,
      });
      if (!error) {
        setHasPurchased(true);
        alert('Purchase successful! You can now download this product.');
      }
    } catch (error) {
      console.error('Error purchasing:', error);
      alert('Purchase failed. Please try again.');
    }
  }

  async function submitReview() {
    if (!profile || !product) return;
    try {
      const { error } = await supabase!.from('product_reviews').insert({
        product_id: product.id, user_id: profile.id,
        rating: reviewForm.rating, comment: reviewForm.comment,
        is_verified_buyer: hasPurchased,
      });
      if (!error) {
        setShowReviewModal(false);
        setReviewForm({ rating: 5, comment: '' });
        fetchProductData();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review.');
    }
  }

  function openEditModal() {
    if (!product) return;
    setEditForm({
      title: product.title, description: product.description || '',
      price: String(product.price), old_price: product.old_price ? String(product.old_price) : '',
      category: product.category, cover_image_url: product.cover_image_url || '',
      platform: product.platform || '', discount_enabled: product.discount_enabled,
      affiliate_link: product.affiliate_link || '',
    });
    setEditFiles(Array.isArray(product.files) ? product.files.map((f: any) => ({
      id: f.id || `file-${Math.random()}`, name: f.name || 'Download', url: f.url || '', size: f.size, type: f.type || 'upload', file_type: f.file_type,
    })) : []);
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setIsSaving(true);
    try {
      const payload = {
        title: editForm.title, description: editForm.description,
        price: parseFloat(editForm.price) || 0, old_price: editForm.old_price ? parseFloat(editForm.old_price) : null,
        category: editForm.category, cover_image_url: editForm.cover_image_url || null,
        platform: editForm.platform || null, discount_enabled: editForm.discount_enabled,
        affiliate_link: editForm.affiliate_link || null, files: editFiles,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase!.from('marketplace_products').update(payload).eq('id', product.id);
      if (error) throw error;
      setShowEditModal(false);
      fetchProductData();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProduct() {
    if (!product) return;
    try {
      const { error } = await supabase!.from('marketplace_products').delete().eq('id', product.id);
      if (error) throw error;
      navigate('/community/marketplace');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  }

  const renderStars = (rating: number, size = 16) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size}
          className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} />
      ))}
    </div>
  );

  const getCategoryIcon = () => {
    switch (product?.category) {
      case 'toolkits': return Package;
      case 'graphics': return Zap;
      case 'courses': return Users;
      default: return Shield;
    }
  };

  if (loading || !id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white text-base">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-white text-base">Product not found</p>
        <button onClick={() => setCurrentPage('marketplace')} className="btn-wise">Back to Marketplace</button>
      </div>
    );
  }

  const CategoryIcon = getCategoryIcon();
  const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => ({
    stars, count: reviews.filter(r => r.rating === stars).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === stars).length / reviews.length) * 100 : 0,
  }));

  const renderPrimaryAction = () => {
    if (hasPurchased) {
      if (product.files && product.files.length > 0) {
        return (
          <div className="space-y-2">
            {product.files.map((file, i) => (
              <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl transition-all group w-full">
                <Download size={18} className="text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white font-semibold text-sm truncate">{file.name}</p>
                  <p className="text-gray-500 text-xs">{file.type === 'url' ? 'External download' : 'Download file'}</p>
                </div>
                <ArrowRight size={16} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
              </a>
            ))}
          </div>
        );
      }
      return (
        <button className="w-full py-4 px-6 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 rounded-2xl text-emerald-400 font-semibold transition-all flex items-center justify-center gap-2.5">
          <Download size={20} /> Download Product
        </button>
      );
    }
    if (product.affiliate_link) {
      return (
        <a href={product.affiliate_link} target="_blank" rel="noopener noreferrer nofollow"
          className="w-full py-4 px-6 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-2xl font-bold transition-all shadow-lg shadow-[#3AA3EB]/25 flex items-center justify-center gap-2.5">
          <ShoppingCart size={20} /> Get This Product <ArrowRight size={18} />
        </a>
      );
    }
    return (
      <button onClick={handlePurchase}
        className="w-full py-4 px-6 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-2xl font-bold transition-all shadow-lg shadow-[#3AA3EB]/25 flex items-center justify-center gap-2.5">
        <ShoppingCart size={20} /> Purchase Now <ArrowRight size={18} />
      </button>
    );
  };

  return (
    <div className="pb-32 lg:pb-12">
      {/* Back Button + Admin Actions */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/community/marketplace')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors group text-sm font-semibold uppercase tracking-wider">
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Marketplace
        </button>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={openEditModal} className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-semibold text-gray-300 transition-colors">
              <Edit2 size={14} /> Edit
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-full text-xs font-semibold text-red-400 transition-colors">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Hero — Product Header */}
      <div className="ios-card rounded-3xl border border-white/10 overflow-hidden mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Gallery / Cover */}
          <div className="relative bg-black/20 p-6 sm:p-8 flex items-center justify-center">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 cursor-pointer group"
              onClick={() => product.preview_images?.length > 0 && setShowGallery(true)}>
              {product.cover_image_url ? (
                <img src={product.cover_image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3AA3EB]/10 to-blue-600/10">
                  <CategoryIcon className="text-[#3AA3EB]/40" size={96} />
                </div>
              )}
              {product.discount_enabled && product.old_price && (
                <div className="absolute top-3 left-3 px-3 py-1.5 bg-red-500 text-white rounded-xl font-bold text-xs shadow-xl uppercase tracking-wider">
                  {Math.round(((product.old_price - product.price) / product.old_price) * 100)}% Off
                </div>
              )}
            </div>
            {product.preview_images?.length > 0 && (
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-gray-500 text-[11px] font-semibold uppercase tracking-widest">
                {product.preview_images.length} previews — click to view
              </p>
            )}
          </div>

          {/* Product Info + Purchase */}
          <div className="p-6 sm:p-8 flex flex-col gap-5 border-t lg:border-t-0 lg:border-l border-white/10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-[#3AA3EB]/10 border border-[#3AA3EB]/20 text-[#3AA3EB] rounded-full text-[11px] font-bold uppercase tracking-wider">
                {product.category}
              </span>
              {product.is_featured && (
                <span className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Featured
                </span>
              )}
              {product.platform && (
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-gray-300 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  {product.platform}
                </span>
              )}
            </div>

            <h1 className="text-white text-3xl sm:text-4xl font-bold leading-tight tracking-tight">{product.title}</h1>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                {renderStars(Math.round(product.rating), 16)}
                <span className="text-white font-bold text-sm">{product.rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({product.reviews_count})</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                <Users size={15} className="text-[#3AA3EB]" />
                <span className="font-semibold text-white">{product.purchases_count}</span> sales
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-white text-4xl font-black tracking-tight">
                {product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`}
              </span>
              {product.discount_enabled && product.old_price && (
                <span className="text-gray-500 text-xl line-through">${product.old_price.toFixed(2)}</span>
              )}
            </div>

            <div className="pt-1">{renderPrimaryAction()}</div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/5">
              {TRUST_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className="p-1.5 bg-[#3AA3EB]/10 rounded-lg flex-shrink-0">
                    <feature.icon size={14} className="text-[#3AA3EB]" />
                  </div>
                  <span className="text-gray-300 text-xs font-medium">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Body — 2 col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard disableHover>
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Zap size={18} className="text-[#3AA3EB]" /> Overview
            </h2>
            <p className="text-gray-300 leading-relaxed text-[15px]">
              {product.description || 'No description available for this product.'}
            </p>
          </GlassCard>

          {product.included_files && product.included_files.length > 0 && (
            <GlassCard disableHover>
              <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <Package size={18} className="text-[#3AA3EB]" /> What's Included
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.included_files.map((file: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="p-1.5 bg-[#3AA3EB]/15 rounded-lg flex-shrink-0">
                      <Check className="text-[#3AA3EB]" size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-bold text-sm mb-0.5">{file.name}</h3>
                      <p className="text-gray-500 text-xs leading-relaxed">{file.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          <GlassCard disableHover>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Customer Reviews</h2>
              {hasPurchased && (
                <button onClick={() => setShowReviewModal(true)} className="px-3.5 py-2 bg-[#3AA3EB]/15 hover:bg-[#3AA3EB]/25 text-[#3AA3EB] rounded-xl transition-colors text-xs font-semibold">
                  Write a Review
                </button>
              )}
            </div>

            <div className="flex items-center gap-6 pb-5 border-b border-white/5">
              <div className="text-center flex-shrink-0">
                <div className="text-white font-black text-4xl leading-none">{product.rating.toFixed(1)}</div>
                {renderStars(Math.round(product.rating), 16)}
                <p className="text-gray-400 mt-1.5 text-xs">{product.reviews_count} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {ratingBreakdown.map(({ stars, count, percentage }) => (
                  <div key={stars} className="flex items-center gap-2.5">
                    <span className="text-gray-400 w-12 text-xs flex items-center gap-0.5">
                      {stars} <Star size={10} className="fill-yellow-400 text-yellow-400" />
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 transition-all rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-gray-400 w-8 text-right text-xs">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-5">
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-center py-6 text-sm">No reviews yet. Be the first to review!</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-start justify-between mb-2.5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-bold text-sm">{review.profiles?.full_name || 'Anonymous'}</span>
                          {review.is_verified_buyer && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-semibold">Verified Buyer</span>
                          )}
                        </div>
                        {renderStars(review.rating, 14)}
                      </div>
                      <span className="text-gray-500 text-xs">{formatAppDate(review.created_at)}</span>
                    </div>
                    {review.comment && <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>}
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start space-y-6">
          <GlassCard disableHover>
            <h2 className="text-white font-bold text-lg mb-4">Features</h2>
            <ul className="space-y-3">
              {TRUST_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <div className="p-1.5 bg-[#3AA3EB]/10 rounded-lg flex-shrink-0">
                    <feature.icon size={15} className="text-[#3AA3EB]" />
                  </div>
                  <span className="text-sm font-medium">{feature.label}</span>
                </li>
              ))}
            </ul>
          </GlassCard>

          {product.tags && product.tags.length > 0 && (
            <GlassCard disableHover>
              <h2 className="text-white font-bold text-lg mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-400 transition-colors">#{tag}</span>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div className="mt-10">
          <h2 className="text-white font-bold text-xl mb-5">You Might Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((rp) => (
              <div key={rp.id} onClick={() => { navigate(`/community/marketplace/${rp.id}`); window.scrollTo(0, 0); }}
                className="ios-card rounded-2xl border border-white/10 overflow-hidden cursor-pointer active:scale-[0.99] group">
                <div className="aspect-[4/3] overflow-hidden">
                  {rp.cover_image_url ? (
                    <img src={rp.cover_image_url} alt={rp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#3AA3EB]/20 to-blue-600/10 flex items-center justify-center">
                      <CategoryIcon className="text-[#3AA3EB]" size={40} />
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">{rp.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-[#3AA3EB] font-black text-lg">${rp.price.toFixed(2)}</span>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-gray-400 text-xs">{rp.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile sticky purchase bar */}
      {!hasPurchased && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 p-3 bg-black/80 backdrop-blur-xl border-t border-white/10">
          <div className="flex items-center justify-between gap-3 max-w-xl mx-auto">
            <div className="min-w-0">
              <p className="text-white font-black text-xl leading-tight">
                {product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`}
              </p>
              <p className="text-gray-400 text-xs">Instant Download</p>
            </div>
            {product.affiliate_link ? (
              <a href={product.affiliate_link} target="_blank" rel="noopener noreferrer nofollow"
                className="px-5 py-3 bg-[#3AA3EB] text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#3AA3EB]/20 flex-shrink-0">
                <ShoppingCart size={18} /> Buy Now
              </a>
            ) : (
              <button onClick={handlePurchase}
                className="px-5 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#3AA3EB]/20 flex-shrink-0 transition-colors">
                <ShoppingCart size={18} /> Buy Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Gallery lightbox */}
      {showGallery && product.preview_images && (
        <>
          <div className="fixed inset-0 bg-black/90 z-50" onClick={() => setShowGallery(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button onClick={() => setShowGallery(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors">
              <X size={24} />
            </button>
            <button onClick={() => setGalleryIndex(Math.max(0, galleryIndex - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors">
              <ChevronLeft size={24} />
            </button>
            <button onClick={() => setGalleryIndex(Math.min(product.preview_images.length - 1, galleryIndex + 1))} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors">
              <ChevronRight size={24} />
            </button>
            <img src={product.preview_images[galleryIndex]} alt={`Preview ${galleryIndex + 1}`} className="max-w-full max-h-full object-contain" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-xl rounded-xl text-white text-sm">
              {galleryIndex + 1} / {product.preview_images.length}
            </div>
          </div>
        </>
      )}

      {/* Review modal — uses base Modal */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Write a Review" maxWidth="max-w-lg"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowReviewModal(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={submitReview} className="btn-primary">Submit Review</button>
          </div>
        }>
        <div className="space-y-5">
          <div>
            <label className={labelCls}>Rating</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setReviewForm({ ...reviewForm, rating: star })}>
                  <Star size={28} className={star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Your Review</label>
            <textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              className={`${inputCls} h-28 resize-none`} placeholder="Share your experience with this product..." />
          </div>
        </div>
      </Modal>

      {/* Edit Product modal — admin inline editing */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product" maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" form="edit-product-form" disabled={isSaving} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }>
        <form id="edit-product-form" onSubmit={handleSaveEdit} className="space-y-5">
          <div>
            <label className={labelCls}>Title</label>
            <input required type="text" value={editForm.title} onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Price ($)</label>
              <input required type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Old Price ($)</label>
              <input type="number" step="0.01" value={editForm.old_price} onChange={e => setEditForm(prev => ({ ...prev, old_price: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select value={editForm.category} onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))} className={inputCls}>
                <option value="templates">Templates</option>
                <option value="toolkits">Toolkits</option>
                <option value="graphics">Graphics</option>
                <option value="courses">Courses</option>
                <option value="docs">Documents</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform</label>
              <input type="text" value={editForm.platform} onChange={e => setEditForm(prev => ({ ...prev, platform: e.target.value }))}
                className={inputCls} placeholder="Notion, Figma, etc." />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cover Image URL</label>
            <input type="url" value={editForm.cover_image_url} onChange={e => setEditForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
              className={inputCls} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={editForm.description} onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              className={`${inputCls} h-24 resize-none`} />
          </div>
          <DownloadUploader value={editFiles} onChange={setEditFiles} label="Downloadable Files" hint="Upload files buyers can download after purchase, or paste an external URL." />
          <div>
            <label className={labelCls}>Affiliate / External Buy Link (optional)</label>
            <input type="url" value={editForm.affiliate_link} onChange={e => setEditForm(prev => ({ ...prev, affiliate_link: e.target.value }))}
              className={inputCls} placeholder="https://partner.com/buy" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={editForm.discount_enabled} onChange={e => setEditForm(prev => ({ ...prev, discount_enabled: e.target.checked }))}
              className="w-4 h-4 rounded accent-[#3AA3EB]" />
            <span className="text-sm text-gray-300">Enable discount (old price shown with strikethrough)</span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Delete "${product.title}"? This cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}
