import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { formatAppDate } from '../lib/dateFormat';
import {
  Users,
  ShoppingBag,
  MessageSquare,
  BookOpen,
  Shield,
  Trash2,
  Edit,
  Plus,
  X,
  Save,
} from 'lucide-react';
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
        const { error } = await supabase.from(table).update(editingItem).eq('id', editingItem.id);
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
          <h2 className="text-white font-bold text-2xl mb-2" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
            Access Denied
          </h2>
          <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            You need administrator privileges to access this page.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Creator Club Backend
          </h1>
          <p className="text-gray-400 mt-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            Manage users, products, channels, and courses
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem({});
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-5 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors font-medium shadow-lg"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          <Plus size={20} />
          Add New
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#3AA3EB] text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
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
            <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'users' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Role</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Created</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>{user.full_name || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                          user.role === 'elite' ? 'bg-yellow-500/20 text-yellow-400' :
                          user.role === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.role?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {formatAppDate(user.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingItem(user);
                            setShowModal(true);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex"
                        >
                          <Edit className="text-[#3AA3EB]" size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete('profiles', user.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex ml-2"
                        >
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
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Title</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Price</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Category</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Featured</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Purchases</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>{product.title}</td>
                      <td className="py-3 px-4 text-green-400 font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>${product.price}</td>
                      <td className="py-3 px-4 text-gray-300 capitalize" style={{ fontFamily: 'Montserrat, sans-serif' }}>{product.category}</td>
                      <td className="py-3 px-4">{product.is_featured ? <span className="text-yellow-400">⭐</span> : '-'}</td>
                      <td className="py-3 px-4 text-gray-400 number" style={{ fontFamily: 'Montserrat, sans-serif' }}>{product.purchases_count}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingItem(product);
                            setShowModal(true);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex"
                        >
                          <Edit className="text-[#3AA3EB]" size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete('marketplace_products', product.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex ml-2"
                        >
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
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Description</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Type</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((channel) => (
                    <tr key={channel.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>{channel.name}</td>
                      <td className="py-3 px-4 text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>{channel.description}</td>
                      <td className="py-3 px-4 text-gray-300 capitalize" style={{ fontFamily: 'Montserrat, sans-serif' }}>{channel.type}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingItem(channel);
                            setShowModal(true);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex"
                        >
                          <Edit className="text-[#3AA3EB]" size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete('chat_channels', channel.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex ml-2"
                        >
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
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Title</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Instructor</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Enrollments</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        No courses found
                      </td>
                    </tr>
                  ) : (
                    courses.map((course) => (
                      <tr key={course.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>{course.title}</td>
                        <td className="py-3 px-4 text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>{course.instructor}</td>
                        <td className="py-3 px-4 text-gray-400 number" style={{ fontFamily: 'Montserrat, sans-serif' }}>{course.enrolled_count || 0}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingItem(course);
                              setShowModal(true);
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex"
                          >
                            <Edit className="text-[#3AA3EB]" size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete('courses', course.id)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-flex ml-2"
                          >
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

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <GlassCard className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold text-xl" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
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
                      <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Full Name</label>
                      <input
                        type="text"
                        value={editingItem?.full_name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, full_name: e.target.value })}
                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Role</label>
                      <select
                        value={editingItem?.role || 'free'}
                        onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="elite">Elite</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors font-medium"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <Save size={20} />
                    Save
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
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
