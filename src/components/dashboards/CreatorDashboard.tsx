import { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, Award, Target, Sparkles, DollarSign, Users, Lightbulb } from 'lucide-react';
import GlassCard from '../GlassCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';

interface CreatorStats {
  courseProgress: {
    title: string;
    progress: number;
  }[];
  newCourses: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  }[];
  marketplaceSales: number;
  referralCount: number;
  rank: string;
}

const dailyTips = [
  "💡 Engage with your students in the discussion boards to boost retention!",
  "🎯 Consistency is key - post new content weekly to keep your audience engaged.",
  "✨ Add downloadable resources to increase course value and student satisfaction.",
  "🚀 Promote your courses in the community to reach more potential students.",
  "📊 Check your analytics regularly to understand what content resonates most.",
  "💎 High-quality thumbnails can increase click-through rates by up to 300%!",
  "🎓 Students love courses with clear learning outcomes - make them visible!"
];

export default function CreatorDashboard() {
  const { profile } = useAuth();
  const { setCurrentPage } = useNavigation();
  const [stats, setStats] = useState<CreatorStats>({
    courseProgress: [],
    newCourses: [],
    marketplaceSales: 0,
    referralCount: 0,
    rank: 'Rising Star'
  });
  const [dailyTip] = useState(dailyTips[Math.floor(Math.random() * dailyTips.length)]);

  useEffect(() => {
    if (profile?.id) {
      fetchStats();
    }
  }, [profile]);

  async function fetchStats() {
    if (!profile?.id) return;

    const [enrollmentsRes, coursesRes, marketplaceRes, referralsRes] = await Promise.all([
      supabase
        .from('course_enrollments')
        .select('progress, courses(title)')
        .eq('user_id', profile.id)
        .limit(3),
      supabase
        .from('courses')
        .select('id, title, thumbnail_url')
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('marketplace_items')
        .select('downloads')
        .eq('creator_id', profile.id),
      supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', profile.id)
        .eq('status', 'completed')
    ]);

    const courseProgress = enrollmentsRes.data?.map((e: any) => ({
      title: e.courses?.title || 'Untitled Course',
      progress: e.progress || 0
    })) || [];

    const newCourses = coursesRes.data || [];
    const marketplaceSales = marketplaceRes.data?.reduce((sum: number, item: any) => sum + (item.downloads || 0), 0) || 0;
    const referralCount = referralsRes.data?.length || 0;

    // Determine rank based on activity
    let rank = 'Newcomer';
    const totalActivity = courseProgress.length + marketplaceSales + referralCount;
    if (totalActivity >= 50) rank = 'Master Creator';
    else if (totalActivity >= 25) rank = 'Expert';
    else if (totalActivity >= 10) rank = 'Rising Star';

    setStats({
      courseProgress,
      newCourses,
      marketplaceSales,
      referralCount,
      rank
    });
  }

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Master Creator': return 'from-purple-500 to-pink-500';
      case 'Expert': return 'from-blue-500 to-cyan-500';
      case 'Rising Star': return 'from-yellow-500 to-orange-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-white font-bold text-[40px] mb-2" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Welcome Back, {profile?.full_name || 'Creator'}
        </h1>
        <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
          Here's what's happening with your creative journey
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="hover:scale-105 transition-transform">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#3AA3EB]/20 rounded-lg">
              <BookOpen className="text-[#3AA3EB]" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Active Courses</p>
              <p className="text-white font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '28px' }}>{stats.courseProgress.length}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="hover:scale-105 transition-transform">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Marketplace Sales</p>
              <p className="text-white font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '28px' }}>{stats.marketplaceSales}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="hover:scale-105 transition-transform">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Users className="text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Referrals</p>
              <p className="text-white font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '28px' }}>{stats.referralCount}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className={`hover:scale-105 transition-transform bg-gradient-to-br ${getRankColor(stats.rank)}`}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Award className="text-white" size={24} />
            </div>
            <div>
              <p className="text-white/90 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Your Rank</p>
              <p className="text-white font-bold" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', fontSize: '16px', textTransform: 'uppercase' }}>{stats.rank}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Daily Tip */}
      <GlassCard className="bg-gradient-to-r from-[#3AA3EB]/10 to-purple-500/10 border-[#3AA3EB]/30">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#3AA3EB]/20 rounded-lg">
            <Lightbulb className="text-[#3AA3EB]" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold mb-2" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Tip</h3>
            <p className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{dailyTip}</p>
          </div>
        </div>
      </GlassCard>

      {/* Course Progress */}
      <div>
        <h2 className="text-white font-bold text-2xl mb-4" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Course Progress</h2>
        <div className="space-y-4">
          {stats.courseProgress.length === 0 ? (
            <GlassCard>
              <p className="text-gray-400 text-center py-8" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                No enrolled courses yet. Start learning today!
              </p>
              <button onClick={() => setCurrentPage('courses')} className="w-full py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors font-medium">
                Browse Courses
              </button>
            </GlassCard>
          ) : (
            stats.courseProgress.map((course, i) => (
              <GlassCard key={i} className="hover:scale-[1.02] transition-transform">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{course.title}</h3>
                  <span className="text-[#3AA3EB] font-bold number" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>{Math.round(course.progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-[#3AA3EB] h-2 rounded-full transition-all" style={{ width: `${course.progress}%` }}></div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      {/* New Drops */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-2xl" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Drops</h2>
          <button onClick={() => setCurrentPage('courses')} className="text-[#3AA3EB] hover:text-[#2a92da] transition-colors" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            View All →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.newCourses.map((course) => (
            <GlassCard key={course.id} className="hover:scale-105 transition-transform cursor-pointer" onClick={() => setCurrentPage('course-single')}>
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg mb-3 flex items-center justify-center">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <BookOpen className="text-white" size={48} />
                )}
              </div>
              <h3 className="text-white font-bold" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{course.title}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Sparkles className="text-[#3AA3EB]" size={16} />
                <span className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>New Release</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-white font-bold text-2xl mb-4" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => setCurrentPage('marketplace')} className="p-6 bg-gradient-to-br from-[#3AA3EB]/20 to-purple-500/20 hover:from-[#3AA3EB]/30 hover:to-purple-500/30 rounded-xl border border-white/10 transition-all text-left group">
            <div className="p-3 bg-[#3AA3EB]/20 rounded-lg inline-block mb-3 group-hover:scale-110 transition-transform">
              <Target className="text-[#3AA3EB]" size={24} />
            </div>
            <h3 className="text-white font-bold mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Explore Marketplace</h3>
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Discover templates & tools</p>
          </button>

          <button onClick={() => setCurrentPage('community')} className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 rounded-xl border border-white/10 transition-all text-left group">
            <div className="p-3 bg-purple-500/20 rounded-lg inline-block mb-3 group-hover:scale-110 transition-transform">
              <Users className="text-purple-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Join Community</h3>
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Connect with creators</p>
          </button>

          <button onClick={() => setCurrentPage('referrals')} className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 rounded-xl border border-white/10 transition-all text-left group">
            <div className="p-3 bg-green-500/20 rounded-lg inline-block mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="text-green-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Earn Rewards</h3>
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Refer friends & earn</p>
          </button>
        </div>
      </div>
    </div>
  );
}
