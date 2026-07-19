import { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, Award, Target, Sparkles, DollarSign, Users, Lightbulb, LayoutDashboard } from 'lucide-react';
import GlassCard from '../GlassCard';
import PageHeader from '../PageHeader';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';

interface CreatorStats {
  courseProgress: { title: string; progress: number }[];
  newCourses: { id: string; title: string; thumbnail_url: string | null }[];
  marketplaceSales: number;
  referralCount: number;
  rank: string;
}

const dailyTips = [
  "Engage with your students in the discussion boards to boost retention!",
  "Consistency is key — post new content weekly to keep your audience engaged.",
  "Add downloadable resources to increase course value and student satisfaction.",
  "Promote your courses in the community to reach more potential students.",
  "Check your analytics regularly to understand what content resonates most.",
  "High-quality thumbnails can increase click-through rates by up to 300%!",
  "Students love courses with clear learning outcomes — make them visible!",
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getLastName(fullName?: string | null) {
  if (!fullName?.trim()) return 'Wise';
  const parts = fullName.trim().split(' ');
  return parts[parts.length - 1];
}

const getRankColor = (rank: string) => {
  switch (rank) {
    case 'Master Creator': return 'from-purple-500 to-pink-500';
    case 'Expert': return 'from-blue-500 to-cyan-500';
    case 'Rising Star': return 'from-yellow-500 to-orange-500';
    default: return 'from-gray-500 to-gray-600';
  }
};

export default function CreatorDashboard() {
  const { profile } = useAuth();
  const { setCurrentPage } = useNavigation();
  const [stats, setStats] = useState<CreatorStats>({
    courseProgress: [],
    newCourses: [],
    marketplaceSales: 0,
    referralCount: 0,
    rank: 'Rising Star',
  });
  const [dailyTip] = useState(dailyTips[Math.floor(Math.random() * dailyTips.length)]);

  useEffect(() => {
    if (profile?.id) fetchStats();
  }, [profile]);

  async function fetchStats() {
    if (!profile?.id || !supabase) return;

    const [enrollmentsRes, coursesRes, marketplaceRes, referralsRes] = await Promise.all([
      supabase.from('course_enrollments').select('progress, courses(title)').eq('user_id', profile.id).limit(3),
      supabase.from('courses').select('id, title, thumbnail_url').order('created_at', { ascending: false }).limit(4),
      supabase.from('marketplace_items').select('downloads').eq('creator_id', profile.id),
      supabase.from('referrals').select('id').eq('referrer_id', profile.id).eq('status', 'completed'),
    ]);

    const courseProgress = enrollmentsRes.data?.map((e: any) => ({
      title: e.courses?.title || 'Untitled Course',
      progress: e.progress || 0,
    })) || [];

    const newCourses = coursesRes.data || [];
    const marketplaceSales = marketplaceRes.data?.reduce((sum: number, item: any) => sum + (item.downloads || 0), 0) || 0;
    const referralCount = referralsRes.data?.length || 0;

    let rank = 'Newcomer';
    const totalActivity = courseProgress.length + marketplaceSales + referralCount;
    if (totalActivity >= 50) rank = 'Master Creator';
    else if (totalActivity >= 25) rank = 'Expert';
    else if (totalActivity >= 10) rank = 'Rising Star';

    setStats({ courseProgress, newCourses, marketplaceSales, referralCount, rank });
  }

  const greeting = `${getGreeting()}, Mr. ${getLastName(profile?.full_name)}`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Creator Hub"
        subtitle={`${greeting} — here's your creative journey at a glance.`}
        icon={<LayoutDashboard className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <GlassCard>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-[#3AA3EB]/20 rounded-lg shrink-0">
              <BookOpen className="text-[#3AA3EB]" size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm font-body">Active Courses</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">{stats.courseProgress.length}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-green-500/20 rounded-lg shrink-0">
              <DollarSign className="text-green-400" size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm font-body">Sales</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">{stats.marketplaceSales}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-purple-500/20 rounded-lg shrink-0">
              <Users className="text-purple-400" size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm font-body">Referrals</p>
              <p className="text-xl sm:text-2xl font-bold text-white font-display">{stats.referralCount}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className={`bg-gradient-to-br ${getRankColor(stats.rank)}`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-white/20 rounded-lg shrink-0">
              <Award className="text-white" size={20} />
            </div>
            <div>
              <p className="text-white/90 text-xs sm:text-sm font-medium font-body">Your Rank</p>
              <p className="text-white font-bold text-sm sm:text-base uppercase font-display">{stats.rank}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="border-[#3AA3EB]/30">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-[#3AA3EB]/20 rounded-lg shrink-0">
            <Lightbulb className="text-[#3AA3EB]" size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold mb-1.5 font-display uppercase tracking-wide text-sm">Daily Tip</h3>
            <p className="text-gray-300 font-body text-sm sm:text-base">{dailyTip}</p>
          </div>
        </div>
      </GlassCard>

      <div>
        <h2 className="text-white font-bold mb-3 sm:mb-4 font-display uppercase tracking-wide text-base sm:text-lg">Your Course Progress</h2>
        <div className="space-y-3 sm:space-y-4">
          {stats.courseProgress.length === 0 ? (
            <GlassCard>
              <p className="text-gray-400 text-center py-6 sm:py-8 font-body text-sm sm:text-base">No enrolled courses yet. Start learning today!</p>
              <button onClick={() => setCurrentPage('courses')} className="w-full py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors font-medium font-body">
                Browse Courses
              </button>
            </GlassCard>
          ) : (
            stats.courseProgress.map((course, i) => (
              <GlassCard key={i}>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-white font-medium font-body text-sm sm:text-base">{course.title}</h3>
                  <span className="text-[#3AA3EB] font-bold font-display text-sm">{Math.round(course.progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="bg-[#3AA3EB] h-1.5 rounded-full transition-all" style={{ width: `${course.progress}%` }} />
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-white font-bold font-display uppercase tracking-wide text-base sm:text-lg">New Drops</h2>
          <button onClick={() => setCurrentPage('courses')} className="text-[#3AA3EB] hover:text-[#2a92da] transition-colors text-sm font-body">View All →</button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {stats.newCourses.map((course) => (
            <GlassCard key={course.id} className="cursor-pointer" onClick={() => setCurrentPage('course-single')}>
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg mb-3 flex items-center justify-center">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <BookOpen className="text-white" size={32} />
                )}
              </div>
              <h3 className="text-white font-medium font-body text-sm">{course.title}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Sparkles className="text-[#3AA3EB]" size={14} />
                <span className="text-gray-400 text-xs font-body">New Release</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-white font-bold mb-3 sm:mb-4 font-display uppercase tracking-wide text-base sm:text-lg">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Explore Marketplace', sub: 'Discover templates & tools', icon: Target, color: 'from-[#3AA3EB]/20 to-purple-500/20 hover:from-[#3AA3EB]/30 hover:to-purple-500/30', iconBg: 'bg-[#3AA3EB]/20', iconColor: 'text-[#3AA3EB]', action: () => setCurrentPage('marketplace') },
            { label: 'Join Community', sub: 'Connect with creators', icon: Users, color: 'from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30', iconBg: 'bg-purple-500/20', iconColor: 'text-purple-400', action: () => setCurrentPage('community') },
            { label: 'Earn Rewards', sub: 'Refer friends & earn', icon: TrendingUp, color: 'from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30', iconBg: 'bg-green-500/20', iconColor: 'text-green-400', action: () => setCurrentPage('referrals') },
          ].map(item => (
            <button key={item.label} onClick={item.action} className={`p-4 sm:p-6 bg-gradient-to-br ${item.color} rounded-xl border border-white/10 transition-all text-left group`}>
              <div className={`p-2.5 sm:p-3 ${item.iconBg} rounded-lg inline-block mb-3 group-hover:scale-110 transition-transform`}>
                <item.icon className={item.iconColor} size={20} />
              </div>
              <h3 className="text-white font-medium mb-1 font-body text-sm sm:text-base">{item.label}</h3>
              <p className="text-gray-400 text-xs sm:text-sm font-body">{item.sub}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
