import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import {
  Star,
  Download,
  ShoppingCart,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Users,
  Zap,
  Shield,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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

export default function MarketplaceProductPage() {
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
  const [productId, setProductId] = useState<string | null>(null);

  useEffect(() => {
    const storedProductId = localStorage.getItem('selectedProductId');
    setProductId(storedProductId);
  }, []);

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId, profile]);

  async function fetchProductData() {
    if (!productId) return;

    try {
      const { data: productData } = await supabase
        .from('marketplace_products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (productData) {
        setProduct(productData);

        const { data: reviewsData } = await supabase
          .from('product_reviews')
          .select('*, profiles(full_name)')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });

        if (reviewsData) setReviews(reviewsData);

        const { data: relatedData } = await supabase
          .from('marketplace_products')
          .select('*')
          .eq('category', productData.category)
          .neq('id', productId)
          .limit(4);

        if (relatedData) setRelatedProducts(relatedData);
      }

      if (profile) {
        const { data: purchaseData } = await supabase
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
      const { error } = await supabase.from('product_purchases').insert({
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
      const { error } = await supabase.from('product_reviews').insert({
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
    <>
      <div className="space-y-16 pb-24">
        <button onClick={() => setCurrentPage('marketplace')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
          <ChevronLeft size={20} />
          Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <GlassCard className="relative">
            {product.discount_enabled && product.old_price && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white rounded-lg font-bold text-sm z-10">
                {Math.round(((product.old_price - product.price) / product.old_price) * 100)}% OFF
              </div>
            )}
            <div
              className="aspect-video bg-gradient-to-br from-[#3AA3EB]/20 to-purple-500/20 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => product.preview_images?.length > 0 && setShowGallery(true)}
            >
              {product.cover_image_url ? (
                <img src={product.cover_image_url} alt={product.title} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <CategoryIcon className="text-[#3AA3EB]" size={80} />
              )}
            </div>
            {product.preview_images?.length > 0 && (
              <p className="text-gray-400 text-sm text-center mt-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Click to view {product.preview_images.length} preview images
              </p>
            )}
          </GlassCard>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-[#3AA3EB]/20 text-[#3AA3EB] rounded-lg text-sm font-medium capitalize">
                  {product.category}
                </span>
                {product.is_featured && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium">
                    Featured
                  </span>
                )}
              </div>
              <h1 className="text-white font-bold text-[32px] mb-3" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {product.title}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                {renderStars(Math.round(product.rating))}
                <span className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                  {product.rating.toFixed(1)} ({product.reviews_count} reviews)
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline gap-3 mb-4">
                {product.discount_enabled && product.old_price && (
                  <span className="text-gray-500 line-through number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '24px' }}>
                    ${product.old_price.toFixed(2)}
                  </span>
                )}
                <span className="text-white font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '40px' }}>
                  ${product.price.toFixed(2)}
                </span>
              </div>

              {hasPurchased ? (
                <button className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-green-500/20 flex items-center justify-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                  <Download size={24} />
                  Download Now
                </button>
              ) : (
                <button onClick={handlePurchase} className="w-full py-4 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-all font-medium shadow-lg shadow-[#3AA3EB]/20 hover:shadow-[#3AA3EB]/40 flex items-center justify-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                  <ShoppingCart size={24} />
                  Buy Now
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <Check className="text-green-400" size={20} />
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>Lifetime Access</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Check className="text-green-400" size={20} />
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>Instant Download</span>
              </div>
              {product.platform && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="text-green-400" size={20} />
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>Built for {product.platform}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-300">
                <Check className="text-green-400" size={20} />
                <span className="number" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>Used by {product.purchases_count}+ creators</span>
              </div>
            </div>

            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-white/5 text-gray-300 rounded-full text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <GlassCard>
          <h2 className="text-white font-bold text-2xl mb-4" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Product Overview
          </h2>
          <p className="text-gray-300 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', lineHeight: '1.8' }}>
            {product.description || 'No description available.'}
          </p>
        </GlassCard>

        {product.included_files && product.included_files.length > 0 && (
          <GlassCard>
            <h2 className="text-white font-bold text-2xl mb-6" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              What's Included
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.included_files.map((file: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
                  <div className="p-2 bg-[#3AA3EB]/20 rounded-lg">
                    <Package className="text-[#3AA3EB]" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{file.name}</h3>
                    <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{file.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-2xl" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
              <div className="text-white font-bold number mb-2" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '48px' }}>{product.rating.toFixed(1)}</div>
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
                      {new Date(review.created_at).toLocaleDateString()}
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
            <h2 className="text-white font-bold text-2xl mb-6" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              You Might Also Like
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <GlassCard
                  key={relatedProduct.id}
                  className="hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => {
                    localStorage.setItem('selectedProductId', relatedProduct.id);
                    window.location.reload();
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
                    <span className="text-[#3AA3EB] font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '20px' }}>${relatedProduct.price.toFixed(2)}</span>
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
              <p className="text-white font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '24px' }}>${product.price.toFixed(2)}</p>
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
                <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Write a Review</h3>
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
    </>
  );
}
