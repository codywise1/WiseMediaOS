import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import PageHeader from '../components/PageHeader';
import { formatAppDate } from '../lib/dateFormat';
import { Users, ShoppingBag, MessageSquare, BookOpen, Shield, Trash2, CreditCard as Edit, Plus, X, Save, Star, Lock, Archive, EyeOff, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function AdminBackendPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'channels' | 'courses'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [activeTab, profile]);

  async function fetchData() {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          const { data: usersData } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          setUsers(usersData || []);
          break;
        case 'products':
          const { data: productsData } = await supabase
            .from('marketplace_products')
            .select('*')
            .order('created_at', { ascending: false });
          setProducts(productsData || []);
          break;
        case 'channels':
          const { data: channelsData } = await supabase
            .from('chat_channels')
            .select('*')
            .order('created_at', { ascending: false });
          setChannels(channelsData || []);
          break;
        case 'courses':
          const { data: coursesData } = await supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });
          setCourses(coursesData || []);
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(table: string, id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete item');
    }
  }

  async function handleSave() {
    if (!editingItem) return;
    try {
      const table = activeTab === 'users' ? 'profiles' : activeTab === 'products' ? 'marketplace_products' : activeTab === 'channels' ? 'chat_channels' : 'courses';
      if (editingItem.id) {
        const { id, ...updates } = editingItem;
        const { error } = await supabase.from(table).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(editingItem);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save item');
    }
  }

  async function toggleFlag(table: string, item: any, flag: string) {
    try {
      const { error } = await supabase.from(table).update({ [flag]: !item[flag], updated_at: new Date().toISOString() }).eq('id', item.id);
      if (error) throw error;
      fetchData();
    } catch (e) {
      console.error('Error toggling:', e);
    }
  }

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'channels', label: 'Channels', icon: MessageSquare },
    { id: 'courses', label: 'Courses', icon: BookOpen },
  ];

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-8 text-center">
          <Shield className="text-red-400 mx-auto mb-4" size={64} />
          <h2 className="text-white font-bold text-2xl mb-2" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
            Access Denied
          </h2>
          <p className="text-gray-400" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>
            You need administrator privileges to access this page.
          </p>
        </GlassCard>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none";
  const labelClass = "block text-gray-300 mb-2";
  const fontBody = { fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif', fontSize: '16px' };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creator Club Backend"
        subtitle="Manage users, products, channels, and courses"
        action={
          <button
            onClick={() => {
              setEditingItem({});
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors font-medium shadow-lg"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}
          >
            <Plus size={20} />
            Add New
          </button>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all font-medium whitespace-nowrap ${activeTab === tab.id
                ? 'bg-[#3AA3EB] text-white shadow-lg'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif', fontSize: '16px' }}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <GlassCard>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'users' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Email</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Role</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Created</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium" style={fontBody}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white" style={fontBody}>{user.full_name || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-300" style={fontBody}>{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-red-500/20 text-red-400' : user.role === 'member' ? 'bg-[#3aa3eb]/20 text-[#3aa3eb]' : 'bg-gray-500/20 text-gray-400'}`}>
                          {user.role?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm" style={fontBody}>
                        {formatAppDate(user.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => { setEditingItem(user); setShowModal(true); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex">
                          <Edit className="text-[#3AA3EB]" size={18} />
                        </button>
                        <button onClick={() => handleDelete('profiles', user.id)} className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex ml-2">
                          <Trash2 className="text-red-400" size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'products' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Title</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Price</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Category</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Featured</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Hidden</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Purchases</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium" style={fontBody}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white" style={fontBody}>{product.title}</td>
                      <td className="py-3 px-4 text-green-400 font-bold number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>${product.price}</td>
                      <td className="py-3 px-4 text-gray-300 capitalize" style={fontBody}>{product.category}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => toggleFlag('marketplace_products', product, 'is_featured')} className={product.is_featured ? 'text-yellow-400' : 'text-gray-600'}>
                          <Star size={18} className={product.is_featured ? 'fill-yellow-400' : ''} />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => toggleFlag('marketplace_products', product, 'is_hidden')} className={product.is_hidden ? 'text-red-400' : 'text-gray-600'}>
                          {product.is_hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-gray-400 number" style={fontBody}>{product.purchases_count}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => { setEditingItem(product); setShowModal(true); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex">
                          <Edit className="text-[#3AA3EB]" size={18} />
                        </button>
                        <button onClick={() => handleDelete('marketplace_products', product.id)} className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex ml-2">
                          <Trash2 className="text-red-400" size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'channels' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Description</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Locked</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Archived</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium" style={fontBody}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((channel) => (
                    <tr key={channel.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white" style={fontBody}>{channel.name}</td>
                      <td className="py-3 px-4 text-gray-400" style={fontBody}>{channel.description}</td>
                      <td className="py-3 px-4 text-gray-300 capitalize" style={fontBody}>{channel.type}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => toggleFlag('chat_channels', channel, 'is_locked')} className={channel.is_locked ? 'text-yellow-400' : 'text-gray-600'}>
                          <Lock size={18} />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => toggleFlag('chat_channels', channel, 'is_archived')} className={channel.is_archived ? 'text-blue-400' : 'text-gray-600'}>
                          <Archive size={18} />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => { setEditingItem(channel); setShowModal(true); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex">
                          <Edit className="text-[#3AA3EB]" size={18} />
                        </button>
                        <button onClick={() => handleDelete('chat_channels', channel.id)} className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex ml-2">
                          <Trash2 className="text-red-400" size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'courses' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Title</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Category</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Featured</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={fontBody}>Enrollments</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium" style={fontBody}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400" style={fontBody}>No courses found</td>
                    </tr>
                  ) : (
                    courses.map((course) => (
                      <tr key={course.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white" style={fontBody}>{course.title}</td>
                        <td className="py-3 px-4 text-gray-300 capitalize" style={fontBody}>{course.category || '-'}</td>
                        <td className="py-3 px-4">
                          <button onClick={() => toggleFlag('courses', course, 'is_featured')} className={course.is_featured ? 'text-yellow-400' : 'text-gray-600'}>
                            <Star size={18} className={course.is_featured ? 'fill-yellow-400' : ''} />
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${(course.status || 'published') === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {(course.status || 'published').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 number" style={fontBody}>{course.enrollment_count || 0}</td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => { setEditingItem(course); setShowModal(true); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex">
                            <Edit className="text-[#3AA3EB]" size={18} />
                          </button>
                          <button onClick={() => handleDelete('courses', course.id)} className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex ml-2">
                            <Trash2 className="text-red-400" size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </GlassCard>

      {showModal && editingItem && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <GlassCard className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold text-xl" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                  {editingItem?.id ? 'Edit' : 'Add'} {activeTab.slice(0, -1)}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="text-gray-400" size={20} />
                </button>
              </div>
              <div className="space-y-4">
                {activeTab === 'users' && (
                  <>
                    <div>
                      <label className={labelClass} style={fontBody}>Full Name</label>
                      <input type="text" value={editingItem?.full_name || ''} onChange={(e) => setEditingItem({ ...editingItem, full_name: e.target.value })} className={inputClass} style={fontBody} />
                    </div>
                    <div>
                      <label className={labelClass} style={fontBody}>Role</label>
                      <select value={editingItem?.role || 'member'} onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })} className={inputClass} style={fontBody}>
                        <option value="member">Creator Member</option>
                        <option value="client">Client</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'products' && (
                  <>
                    <div>
                      <label className={labelClass} style={fontBody}>Title</label>
                      <input type="text" value={editingItem?.title || ''} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} className={inputClass} style={fontBody} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass} style={fontBody}>Price ($)</label>
                        <input type="number" step="0.01" value={editingItem?.price ?? ''} onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })} className={inputClass} style={fontBody} />
                      </div>
                      <div>
                        <label className={labelClass} style={fontBody}>Old Price ($)</label>
                        <input type="number" step="0.01" value={editingItem?.old_price ?? ''} onChange={(e) => setEditingItem({ ...editingItem, old_price: e.target.value ? parseFloat(e.target.value) : null })} className={inputClass} style={fontBody} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass} style={fontBody}>Category</label>
                        <select value={editingItem?.category || 'templates'} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })} className={inputClass} style={fontBody}>
                          <option value="templates">Templates</option>
                          <option value="toolkits">Toolkits</option>
                          <option value="graphics">Graphics</option>
                          <option value="courses">Courses</option>
                          <option value="docs">Documents</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass} style={fontBody}>Platform</label>
                        <input type="text" value={editingItem?.platform || ''} onChange={(e) => setEditingItem({ ...editingItem, platform: e.target.value })} className={inputClass} style={fontBody} placeholder="Notion, Figma..." />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass} style={fontBody}>Cover Image URL</label>
                      <input type="url" value={editingItem?.cover_image_url || ''} onChange={(e) => setEditingItem({ ...editingItem, cover_image_url: e.target.value })} className={inputClass} style={fontBody} placeholder="https://..." />
                    </div>
                    <div>
                      <label className={labelClass} style={fontBody}>Description</label>
                      <textarea value={editingItem?.description || ''} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} className={inputClass} style={fontBody} rows={3} />
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!editingItem?.is_featured} onChange={(e) => setEditingItem({ ...editingItem, is_featured: e.target.checked })} className="w-4 h-4 accent-[#3AA3EB]" />
                        <span className="text-sm text-gray-300" style={fontBody}>Featured</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!editingItem?.discount_enabled} onChange={(e) => setEditingItem({ ...editingItem, discount_enabled: e.target.checked })} className="w-4 h-4 accent-[#3AA3EB]" />
                        <span className="text-sm text-gray-300" style={fontBody}>Discount enabled</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!editingItem?.is_hidden} onChange={(e) => setEditingItem({ ...editingItem, is_hidden: e.target.checked })} className="w-4 h-4 accent-[#3AA3EB]" />
                        <span className="text-sm text-gray-300" style={fontBody}>Hidden</span>
                      </label>
                    </div>
                  </>
                )}

                {activeTab === 'channels' && (
                  <>
                    <div>
                      <label className={labelClass} style={fontBody}>Channel Name</label>
                      <input type="text" value={editingItem?.name || ''} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className={inputClass} style={fontBody} />
                    </div>
                    <div>
                      <label className={labelClass} style={fontBody}>Description</label>
                      <textarea value={editingItem?.description || ''} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} className={inputClass} style={fontBody} rows={2} />
                    </div>
                    <div>
                      <label className={labelClass} style={fontBody}>Type</label>
                      <select value={editingItem?.type || 'general'} onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })} className={inputClass} style={fontBody}>
                        <option value="general">General</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!editingItem?.is_locked} onChange={(e) => setEditingItem({ ...editingItem, is_locked: e.target.checked })} className="w-4 h-4 accent-[#3AA3EB]" />
                        <span className="text-sm text-gray-300" style={fontBody}>Locked</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!editingItem?.is_archived} onChange={(e) => setEditingItem({ ...editingItem, is_archived: e.target.checked })} className="w-4 h-4 accent-[#3AA3EB]" />
                        <span className="text-sm text-gray-300" style={fontBody}>Archived</span>
                      </label>
                    </div>
                  </>
                )}

                {activeTab === 'courses' && (
                  <>
                    <div>
                      <label className={labelClass} style={fontBody}>Course Title</label>
                      <input type="text" value={editingItem?.title || ''} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} className={inputClass} style={fontBody} />
                    </div>
                    <div>
                      <label className={labelClass} style={fontBody}>Description</label>
                      <textarea value={editingItem?.description || ''} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} className={inputClass} style={fontBody} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass} style={fontBody}>Category</label>
                        <select value={editingItem?.category || 'Growth'} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })} className={inputClass} style={fontBody}>
                          <option value="Growth">Growth</option>
                          <option value="Creative">Creative</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Strategy">Strategy</option>
                          <option value="Operations">Operations</option>
                          <option value="Sales">Sales</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass} style={fontBody}>Status</label>
                        <select value={editingItem?.status || 'published'} onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })} className={inputClass} style={fontBody}>
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass} style={fontBody}>Thumbnail URL</label>
                      <input type="url" value={editingItem?.thumbnail_url || ''} onChange={(e) => setEditingItem({ ...editingItem, thumbnail_url: e.target.value })} className={inputClass} style={fontBody} placeholder="https://..." />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editingItem?.is_featured} onChange={(e) => setEditingItem({ ...editingItem, is_featured: e.target.checked })} className="w-4 h-4 accent-[#3AA3EB]" />
                      <span className="text-sm text-gray-300" style={fontBody}>Featured course</span>
                    </label>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors font-medium" style={fontBody}>
                    <Save size={20} />
                    Save
                  </button>
                  <button onClick={() => setShowModal(false)} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors" style={fontBody}>
                    Cancel
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}
