import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { ShoppingBag, Star, Package, Zap, Users, Shield, FileText } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { supabase } from '../lib/supabase';

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
}

export default function MarketplacePage() {
  const { setCurrentPage } = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .select('id, title, price, old_price, category, rating, reviews_count, cover_image_url, is_featured, discount_enabled, platform')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleProductClick(productId: string) {
    localStorage.setItem('selectedProductId', productId);
    setCurrentPage('marketplace-product');
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
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
    ? products
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white font-bold text-[40px] mb-2" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Marketplace
        </h1>
        <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
          Discover premium tools, templates, and resources for creators
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg transition-all font-medium ${
              selectedCategory === cat.id
                ? 'bg-[#3AA3EB] text-white shadow-lg shadow-[#3AA3EB]/20'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
            style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <GlassCard key={i}>
              <div className="animate-pulse space-y-3">
                <div className="h-40 bg-white/5 rounded-lg" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-6 bg-white/5 rounded w-1/2" />
              </div>
            </GlassCard>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <GlassCard>
          <p className="text-gray-400 text-center py-12" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            No products found in this category.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const CategoryIcon = getCategoryIcon(product.category);
            return (
              <GlassCard
                key={product.id}
                className="hover:scale-105 transition-transform cursor-pointer relative"
                onClick={() => handleProductClick(product.id)}
              >
                {product.is_featured && (
                  <div className="absolute top-4 right-4 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold z-10">
                    FEATURED
                  </div>
                )}
                {product.discount_enabled && product.old_price && (
                  <div className="absolute top-4 left-4 px-2 py-1 bg-red-500 text-white rounded text-xs font-bold z-10">
                    {Math.round(((product.old_price - product.price) / product.old_price) * 100)}% OFF
                  </div>
                )}
                <div className="space-y-3">
                  <div className="h-40 bg-gradient-to-br from-[#3AA3EB]/20 to-purple-500/20 rounded-lg flex items-center justify-center overflow-hidden">
                    {product.cover_image_url ? (
                      <img
                        src={product.cover_image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <CategoryIcon className="text-[#3AA3EB]" size={48} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400 px-2 py-1 bg-white/5 rounded capitalize" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {product.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="text-yellow-400 fill-yellow-400" size={14} />
                        <span className="text-white text-sm font-semibold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
                          {product.rating.toFixed(1)}
                        </span>
                        <span className="text-gray-400 text-xs number" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          ({product.reviews_count})
                        </span>
                      </div>
                    </div>
                    <h3
                      className="text-white font-bold text-lg mb-3 line-clamp-2"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      {product.title}
                    </h3>
                    {product.platform && (
                      <p className="text-gray-400 text-xs mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Built for {product.platform}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        {product.discount_enabled && product.old_price && (
                          <span className="text-gray-500 line-through text-sm number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
                            ${product.old_price.toFixed(2)}
                          </span>
                        )}
                        <span className="text-2xl font-bold text-white number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      <button className="px-4 py-2 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-all font-medium shadow-lg shadow-[#3AA3EB]/20 hover:shadow-[#3AA3EB]/40 text-sm">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
