import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import {
  Star,
  Download,
  ShoppingCart,
  Check,
  X,
  Shield,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Package,
  Users,
  Zap
} from 'lucide-react';
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
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  is_verified_buyer: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

export default function MarketplaceDetails() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { setCurrentPage } = useNavigation();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [productId, setProductId] = useState<string | null>(id || null);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      setProductId(id);
    }
  }, [id]);

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId, profile]);

  async function fetchProductData() {
    if (!productId) return;

    try {
      const { data: productData } = await supabase!
        .from('marketplace_products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (productData) {
        setProduct(productData);

        const { data: reviewsData } = await supabase!
          .from('product_reviews')
          .select('*, profiles(full_name)')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });

        if (reviewsData) setReviews(reviewsData);

        const { data: relatedData } = await supabase!
          .from('marketplace_products')
          .select('*')
          .eq('category', productData.category)
          .neq('id', productId)
          .limit(4);

        if (relatedData) setRelatedProducts(relatedData);
      }

      if (profile) {
        const { data: purchaseData } = await supabase!
          .from('product_purchases')
          .select('id')
          .eq('product_id', productId)
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
        product_id: product.id,
        user_id: profile.id,
        amount_paid: product.price,
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
        product_id: product.id,
        user_id: profile.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
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

  const renderStars = (rating: number, size = 20) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
          />
        ))}
      </div>
    );
  };

  const getCategoryIcon = () => {
    switch (product?.category) {
      case 'toolkits': return Package;
      case 'graphics': return Zap;
      case 'courses': return Users;
      default: return Shield;
    }
  };

  if (loading || !productId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-white mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Product not found</p>
        <button onClick={() => setCurrentPage('marketplace')} className="px-6 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors">
          Back to Marketplace
        </button>
      </div>
    );
  }

  const CategoryIcon = getCategoryIcon();
  const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === stars).length / reviews.length) * 100 : 0
  }));

  return (
    <div className="pb-24">
      {/* Back Button */}
      <button
        onClick={() => navigate('/community/marketplace')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}
      >
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Back to Marketplace
      </button>

      <div className="space-y-12">
        {/* Header Section */}
        <div className="glass-card neon-glow rounded-3xl p-6 sm:p-8 lg:p-10 border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Product Image/Gallery */}
            <div className="relative">
              <div
                className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer"
                onClick={() => product.preview_images?.length > 0 && setShowGallery(true)}
              >
                {product.cover_image_url ? (
                  <img src={product.cover_image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3AA3EB]/10 to-purple-500/10">
                    <CategoryIcon className="text-[#3AA3EB]/40" size={120} />
                  </div>
                )}

                {product.discount_enabled && product.old_price && (
                  <div className="absolute top-4 right-4 px-4 py-2 bg-[#3AA3EB] text-white rounded-xl font-bold text-sm shadow-xl shadow-[#3AA3EB]/30 z-10">
                    {Math.round(((product.old_price - product.price) / product.old_price) * 100)}% OFF
                  </div>
                )}
              </div>
              {product.preview_images?.length > 0 && (
                <div className="flex justify-center mt-4 gap-2">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                    Click to view {product.preview_images.length} preview images
                  </p>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#3AA3EB]/10 border border-[#3AA3EB]/20 text-[#3AA3EB] rounded-full text-xs font-bold uppercase tracking-widest">
                  {product.category}
                </span>
                {product.is_featured && (
                  <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full text-xs font-bold uppercase tracking-widest">
                    Featured Item
                  </span>
                )}
              </div>

              <h1 className="text-white text-[48px] font-bold leading-tight" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {product.title}
              </h1>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  {renderStars(Math.round(product.rating), 18)}
                  <span className="text-white font-bold text-sm ml-1">{product.rating.toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">({product.reviews_count} reviews)</span>
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <Users size={16} className="text-[#3AA3EB]" />
                  <span className="number">{product.purchases_count}</span>
                  <span>Sales</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-baseline gap-4">
                  <span className="text-white text-5xl font-bold number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                    ${product.price.toFixed(2)}
                  </span>
                  {product.discount_enabled && product.old_price && (
                    <span className="text-gray-500 text-2xl line-through number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                      ${product.old_price.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {hasPurchased ? (
                    <button className="flex-1 btn-header-glass py-5 px-8 bg-green-500/10 border-green-500/30">
                      <span className="btn-text-glow flex items-center justify-center gap-3 text-green-400">
                        <Download size={22} />
                        Download Product
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePurchase}
                      className="flex-1 btn-header-glass py-5 px-8"
                    >
                      <span className="btn-text-glow flex items-center justify-center gap-3">
                        <ShoppingCart size={22} />
                        Purchase Now
                        <ArrowRight size={20} />
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <GlassCard>
              <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-3" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase' }}>
                <Zap size={20} className="text-[#3AA3EB]" />
                Product Overview
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {product.description || 'No description available for this product.'}
                </p>
              </div>
            </GlassCard>

            {product.included_files && product.included_files.length > 0 && (
              <GlassCard>
                <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-3" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase' }}>
                  <Package size={20} className="text-[#3AA3EB]" />
                  What's Included
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {product.included_files.map((file: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="p-2 bg-[#3AA3EB]/20 rounded-xl">
                        <Check className="text-[#3AA3EB]" size={18} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>{file.name}</h3>
                        <p className="text-gray-500 text-xs leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>{file.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          <div className="space-y-8">
            <GlassCard>
              <h2 className="text-white font-bold text-xl mb-6" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase' }}>
                Features
              </h2>
              <ul className="space-y-4">
                {[
                  { label: 'Lifetime Access', icon: Shield },
                  { label: 'Instant Download', icon: Download },
                  { label: 'Personal License', icon: Check },
                  { label: 'Premium Support', icon: Users }
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <div className="p-1.5 bg-[#3AA3EB]/10 rounded-lg">
                      <feature.icon size={16} className="text-[#3AA3EB]" />
                    </div>
                    <span className="text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{feature.label}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            {product.tags && product.tags.length > 0 && (
              <GlassCard>
                <h2 className="text-white font-bold text-xl mb-6" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase' }}>
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-400 transition-colors" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>

        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-2xl" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Customer Reviews
            </h2>
            {hasPurchased && (
              <button onClick={() => setShowReviewModal(true)} className="px-4 py-2 bg-[#3AA3EB]/20 hover:bg-[#3AA3EB]/30 text-[#3AA3EB] rounded-lg transition-colors text-sm font-medium">
                Write a Review
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <div className="text-white font-bold number mb-2" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '48px' }}>{product.rating.toFixed(1)}</div>
              {renderStars(Math.round(product.rating), 24)}
              <p className="text-gray-400 mt-2 number" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{product.reviews_count} reviews</p>
            </div>

            <div className="lg:col-span-2 space-y-2">
              {ratingBreakdown.map(({ stars, count, percentage }) => (
                <div key={stars} className="flex items-center gap-3">
                  <span className="text-gray-400 w-16 number" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>{stars} stars</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-gray-400 w-12 text-right number" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-gray-400 text-center py-8" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>No reviews yet. Be the first to review!</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-white font-bold" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                          {review.profiles?.full_name || 'Anonymous'}
                        </span>
                        {review.is_verified_buyer && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                            Verified Buyer
                          </span>
                        )}
                      </div>
                      {renderStars(review.rating, 16)}
                    </div>
                    <span className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {formatAppDate(review.created_at)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-white font-bold text-2xl mb-6" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              You Might Also Like
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <GlassCard
                  key={relatedProduct.id}
                  className="hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => {
                    navigate(`/community/marketplace/${relatedProduct.id}`);
                    window.scrollTo(0, 0);
                  }}
                >
                  <div className="aspect-video bg-gradient-to-br from-[#3AA3EB]/20 to-purple-500/20 rounded-lg mb-3 flex items-center justify-center">
                    {relatedProduct.cover_image_url ? (
                      <img src={relatedProduct.cover_image_url} alt={relatedProduct.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <CategoryIcon className="text-[#3AA3EB]" size={48} />
                    )}
                  </div>
                  <h3 className="text-white font-bold mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{relatedProduct.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-[#3AA3EB] font-bold number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '20px' }}>${relatedProduct.price.toFixed(2)}</span>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-gray-400 text-sm number">{relatedProduct.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>

      {!hasPurchased && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div>
              <p className="text-white font-bold number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '24px' }}>${product.price.toFixed(2)}</p>
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Instant Download</p>
            </div>
            <button onClick={handlePurchase} className="px-6 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-all font-medium shadow-lg shadow-[#3AA3EB]/20 flex items-center gap-2">
              <ShoppingCart size={20} />
              Buy Now
            </button>
          </div>
        </div>
      )}

      {showGallery && product.preview_images && (
        <>
          <div className="fixed inset-0 bg-black/90 z-50" onClick={() => setShowGallery(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button onClick={() => setShowGallery(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
              <X size={24} />
            </button>
            <button onClick={() => setGalleryIndex(Math.max(0, galleryIndex - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
              <ChevronLeft size={24} />
            </button>
            <button onClick={() => setGalleryIndex(Math.min(product.preview_images.length - 1, galleryIndex + 1))} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
              <ChevronRight size={24} />
            </button>
            <img src={product.preview_images[galleryIndex]} alt={`Preview ${galleryIndex + 1}`} className="max-w-full max-h-full object-contain" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-xl rounded-lg text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {galleryIndex + 1} / {product.preview_images.length}
            </div>
          </div>
        </>
      )}

      {showReviewModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowReviewModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <GlassCard className="w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Write a Review</h3>
                <button onClick={() => setShowReviewModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setReviewForm({ ...reviewForm, rating: star })}>
                        <Star size={32} className={star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Your Review</label>
                  <textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none h-32" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }} placeholder="Share your experience with this product..." />
                </div>
                <button onClick={submitReview} className="w-full py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors font-medium" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                  Submit Review
                </button>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}
