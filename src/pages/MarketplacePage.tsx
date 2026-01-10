import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { Star, Package, Zap, Users, Shield, FileText, Layout, Grid } from 'lucide-react';
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
      const dbProducts = supabase ? (await supabase
        .from('marketplace_products')
        .select('id, title, price, old_price, category, rating, reviews_count, cover_image_url, is_featured, discount_enabled, platform')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })).data || [] : [];
      const mockProducts: Product[] = [
        {
          id: 'mock-1',
          title: 'Premium Agency Notion OS',
          price: 49.99,
          old_price: 99.99,
          category: 'templates',
          rating: 5.0,
          reviews_count: 128,
          cover_image_url: '/src/media/marketplace_notion.png',
          is_featured: true,
          discount_enabled: true,
          platform: 'Notion'
        },
        {
          id: 'mock-2',
          title: 'Creator Contract Bundle',
          price: 149.00,
          old_price: 299.00,
          category: 'docs',
          rating: 4.9,
          reviews_count: 85,
          cover_image_url: '/src/media/marketplace_legal.png',
          is_featured: true,
          discount_enabled: true,
          platform: 'PDF/Word'
        },
        {
          id: 'mock-3',
          title: 'Vibrant Social Assets',
          price: 29.00,
          old_price: null,
          category: 'graphics',
          rating: 4.8,
          reviews_count: 56,
          cover_image_url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800',
          is_featured: false,
          discount_enabled: false,
          platform: 'Canva/Figma'
        },
        {
          id: 'mock-4',
          title: 'Scaling Playbook 2024',
          price: 79.00,
          old_price: 120.00,
          category: 'courses',
          rating: 5.0,
          reviews_count: 210,
          cover_image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800',
          is_featured: false,
          discount_enabled: true,
          platform: 'Digital Access'
        },
        {
          id: 'mock-5',
          title: 'Client CRM Toolkit',
          price: 39.00,
          old_price: null,
          category: 'toolkits',
          rating: 4.7,
          reviews_count: 42,
          cover_image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
          is_featured: false,
          discount_enabled: false,
          platform: 'Airtable'
        },
        {
          id: 'mock-6',
          title: 'Pitch Deck Master Template',
          price: 59.00,
          old_price: 89.00,
          category: 'templates',
          rating: 4.9,
          reviews_count: 73,
          cover_image_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800',
          is_featured: false,
          discount_enabled: true,
          platform: 'PowerPoint/Keynote'
        }
      ];

      setProducts([...mockProducts, ...dbProducts]);
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
    ? products
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Marketplace
            </h1>
            <p className="text-gray-400 mt-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Premium tools, templates, and resources to accelerate your growth.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
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
                        <span className="text-white text-sm font-semibold number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
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
                          <span className="text-gray-500 line-through text-sm number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                            ${product.old_price.toFixed(2)}
                          </span>
                        )}
                        <span className="text-2xl font-bold text-white number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
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
