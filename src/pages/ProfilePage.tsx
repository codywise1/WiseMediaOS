import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import {
  User,
  Mail,
  Briefcase,
  Calendar,
  Camera,
  Save,
  X,
  MapPin,
  Link as LinkIcon,
  Award,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { supabase } from '../lib/supabase';

export default function ProfilePage() {
  const { profile } = useAuth();
  const { setCurrentPage } = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalReviews: 0,
    memberDays: 0,
  });
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
    location: '',
    website: '',
    twitter: '',
    instagram: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        location: profile.location || '',
        website: profile.website || '',
        twitter: profile.twitter || '',
        instagram: profile.instagram || '',
      });
      fetchUserStats();
    }
  }, [profile]);

  async function fetchUserStats() {
    if (!profile?.id) return;

    try {
      const { data: purchases } = await supabase
        .from('product_purchases')
        .select('id')
        .eq('user_id', profile.id);

      const { data: reviews } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('user_id', profile.id);

      const memberDays = profile.created_at
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      setStats({
        totalPurchases: purchases?.length || 0,
        totalReviews: reviews?.length || 0,
        memberDays,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  const handleSave = async () => {
    if (!profile?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          location: formData.location,
          website: formData.website,
          twitter: formData.twitter,
          instagram: formData.instagram,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
      avatar_url: profile?.avatar_url || '',
      location: profile?.location || '',
      website: profile?.website || '',
      twitter: profile?.twitter || '',
      instagram: profile?.instagram || '',
    });
    setIsEditing(false);
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return profile?.email?.[0].toUpperCase() || 'U';
  };

  const getRoleBadgeColor = () => {
    switch (profile?.role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'elite': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'pro': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <GlassCard className="p-4 bg-green-500/20 border-green-500/50">
            <p className="text-white font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Profile updated successfully!</p>
          </GlassCard>
        </div>
      )}

      <div className="relative h-48 bg-gradient-to-r from-[#3AA3EB] via-purple-500 to-pink-500 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 px-5 py-2.5 bg-white/20 backdrop-blur-xl hover:bg-white/30 text-white rounded-lg transition-all font-medium border border-white/30"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="relative -mt-20 px-4 lg:px-0">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-80">
            <GlassCard>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative -mt-16">
                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-black shadow-2xl"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-[#3AA3EB] to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-4xl border-4 border-black shadow-2xl">
                      {getInitials()}
                    </div>
                  )}
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 p-3 bg-[#3AA3EB] rounded-full text-white hover:bg-[#2a92da] transition-colors shadow-lg">
                      <Camera size={18} />
                    </button>
                  )}
                </div>

                <div className="w-full">
                  <h2 className="text-white font-bold text-2xl mb-1" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
                    {profile?.full_name || 'User'}
                  </h2>
                  <p className="text-gray-400 mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>{profile?.email}</p>
                  <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold border ${getRoleBadgeColor()}`} style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase' }}>
                    {profile?.role}
                  </span>
                </div>

                {profile?.bio && !isEditing && (
                  <p className="text-gray-300 text-sm leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {profile.bio}
                  </p>
                )}

                {!isEditing && (
                  <div className="w-full space-y-3 pt-4 border-t border-white/10">
                    {profile?.location && (
                      <div className="flex items-center gap-3 text-gray-300">
                        <MapPin size={18} className="text-gray-500" />
                        <span className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{profile.location}</span>
                      </div>
                    )}
                    {profile?.website && (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[#3AA3EB] hover:text-[#2a92da] transition-colors">
                        <LinkIcon size={18} />
                        <span className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Website</span>
                      </a>
                    )}
                    {profile?.twitter && (
                      <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[#3AA3EB] hover:text-[#2a92da] transition-colors">
                        <span className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>@{profile.twitter}</span>
                      </a>
                    )}
                    {profile?.instagram && (
                      <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[#3AA3EB] hover:text-[#2a92da] transition-colors">
                        <span className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>@{profile.instagram}</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="w-full grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <div className="text-white font-bold text-2xl number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>{stats.totalPurchases}</div>
                    <div className="text-gray-400 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Purchases</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-2xl number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>{stats.totalReviews}</div>
                    <div className="text-gray-400 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-2xl number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>{stats.memberDays}</div>
                    <div className="text-gray-400 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Days</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="flex-1 space-y-6">
            {isEditing ? (
              <GlassCard>
                <h3 className="text-white font-bold text-xl mb-6" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase' }}>
                  Edit Profile
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none transition-all"
                        placeholder="Enter your full name"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none transition-all"
                        placeholder="City, Country"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none transition-all resize-none"
                      placeholder="Tell us about yourself..."
                      style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      value={formData.avatar_url}
                      onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                      className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none transition-all"
                      placeholder="https://example.com/avatar.jpg"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none transition-all"
                      placeholder="https://yourwebsite.com"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Twitter Username
                      </label>
                      <input
                        type="text"
                        value={formData.twitter}
                        onChange={(e) => setFormData({ ...formData, twitter: e.target.value.replace('@', '') })}
                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none transition-all"
                        placeholder="username"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Instagram Username
                      </label>
                      <input
                        type="text"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value.replace('@', '') })}
                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none transition-all"
                        placeholder="username"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/50 text-white rounded-lg transition-colors font-medium shadow-lg"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <Save size={20} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <X size={20} />
                      Cancel
                    </button>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <>
                <GlassCard>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-[#3AA3EB]/20 rounded-lg">
                      <Award className="text-[#3AA3EB]" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase' }}>
                        Achievements
                      </h3>
                      <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Your milestones and badges</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.memberDays >= 7 && (
                      <div className="p-4 bg-white/5 rounded-lg text-center border border-white/10">
                        <div className="text-2xl mb-2">🎯</div>
                        <div className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Week One</div>
                      </div>
                    )}
                    {stats.totalPurchases > 0 && (
                      <div className="p-4 bg-white/5 rounded-lg text-center border border-white/10">
                        <div className="text-2xl mb-2">🛍️</div>
                        <div className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>First Purchase</div>
                      </div>
                    )}
                    {stats.totalReviews > 0 && (
                      <div className="p-4 bg-white/5 rounded-lg text-center border border-white/10">
                        <div className="text-2xl mb-2">⭐</div>
                        <div className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Reviewer</div>
                      </div>
                    )}
                    {profile?.role === 'elite' && (
                      <div className="p-4 bg-yellow-500/10 rounded-lg text-center border border-yellow-500/30">
                        <div className="text-2xl mb-2">👑</div>
                        <div className="text-yellow-400 font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Elite Member</div>
                      </div>
                    )}
                    {profile?.role === 'admin' && (
                      <div className="p-4 bg-red-500/10 rounded-lg text-center border border-red-500/30">
                        <div className="text-2xl mb-2">🔥</div>
                        <div className="text-red-400 font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Admin</div>
                      </div>
                    )}
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-[#3AA3EB]/20 rounded-lg">
                      <Clock className="text-[#3AA3EB]" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase' }}>
                        Account Details
                      </h3>
                      <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Member information</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 text-gray-300">
                      <Mail size={20} className="text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email</p>
                        <p className="font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-gray-300">
                      <Briefcase size={20} className="text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>Role</p>
                        <p className="font-medium capitalize" style={{ fontFamily: 'Montserrat, sans-serif' }}>{profile?.role}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-gray-300">
                      <Calendar size={20} className="text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>Member Since</p>
                        <p className="font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
