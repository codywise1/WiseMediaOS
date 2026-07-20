import { useEffect, useState } from 'react';
import { DollarSign, Users, BookOpen, ShoppingBag, TrendingUp, AlertCircle, Calendar, Lightbulb, LayoutDashboard } from 'lucide-react';
import GlassCard from '../GlassCard';
import PageHeader from '../PageHeader';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Stats {
  totalRevenue: number;
  subscriptions: { free: number; pro: number; elite: number };
  topCourse: { title: string; enrollments: number } | null;
  marketplaceActivity: { topSeller: string; downloads: number } | null;
  upcomingAppointments: number;
  unpaidInvoices: number;
}

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

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    subscriptions: { free: 0, pro: 0, elite: 0 },
    topCourse: null,
    marketplaceActivity: null,
    upcomingAppointments: 0,
    unpaidInvoices: 0,
  });

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    const [profilesRes, coursesRes, marketplaceRes, appointmentsRes, invoicesRes] = await Promise.all([
      supabase.from('profiles').select('role'),
      supabase.from('courses').select('title, enrollment_count').order('enrollment_count', { ascending: false }).limit(1),
      supabase.from('marketplace_items').select('title, downloads').order('downloads', { ascending: false }).limit(1),
      supabase.from('appointments').select('id').eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()),
      supabase.from('invoices').select('amount').eq('status', 'pending'),
    ]);

    const subscriptions = {
      free: profilesRes.data?.filter(p => p.role === 'free').length || 0,
      pro: profilesRes.data?.filter(p => p.role === 'pro').length || 0,
      elite: profilesRes.data?.filter(p => p.role === 'elite').length || 0,
    };
    const totalRevenue = invoicesRes.data?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

    setStats({
      totalRevenue,
      subscriptions,
      topCourse: coursesRes.data?.[0] ? { title: coursesRes.data[0].title, enrollments: coursesRes.data[0].enrollment_count } : null,
      marketplaceActivity: marketplaceRes.data?.[0] ? { topSeller: marketplaceRes.data[0].title, downloads: marketplaceRes.data[0].downloads } : null,
      upcomingAppointments: appointmentsRes.data?.length || 0,
      unpaidInvoices: invoicesRes.data?.length || 0,
    });
  }

  const greeting = `${getGreeting()}, Mr. ${getLastName(profile?.full_name)}`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={`${greeting} — here's your business overview.`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
              <DollarSign className="text-blue-400" size={20} />
            </div>
            <TrendingUp className="text-green-400" size={18} />
          </div>
          <h3 className="text-gray-400 mb-1 text-xs sm:text-sm font-body">Total Revenue</h3>
          <p className="text-2xl sm:text-3xl font-bold text-white font-display">${stats.totalRevenue.toLocaleString()}</p>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
              <Users className="text-blue-400" size={20} />
            </div>
          </div>
          <h3 className="text-gray-400 mb-1 text-xs sm:text-sm font-body">Total Members</h3>
          <p className="text-2xl sm:text-3xl font-bold text-white font-display mb-1">
            {stats.subscriptions.free + stats.subscriptions.pro + stats.subscriptions.elite}
          </p>
          <div className="flex gap-2 text-xs font-body">
            <span className="text-gray-400">Free: {stats.subscriptions.free}</span>
            <span className="text-gray-400">Pro: {stats.subscriptions.pro}</span>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
              <Calendar className="text-blue-400" size={20} />
            </div>
          </div>
          <h3 className="text-gray-400 mb-1 text-xs sm:text-sm font-body">Upcoming Calls</h3>
          <p className="text-2xl sm:text-3xl font-bold text-white font-display">{stats.upcomingAppointments}</p>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center">
              <AlertCircle className="text-red-400" size={20} />
            </div>
          </div>
          <h3 className="text-gray-400 mb-1 text-xs sm:text-sm font-body">Unpaid Invoices</h3>
          <p className="text-2xl sm:text-3xl font-bold text-white font-display">{stats.unpaidInvoices}</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center shrink-0">
              <BookOpen className="text-blue-400" size={18} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white font-display uppercase tracking-wide">Top Course This Week</h3>
          </div>
          {stats.topCourse ? (
            <div>
              <p className="text-white text-base font-medium mb-1 font-body">{stats.topCourse.title}</p>
              <p className="text-gray-400 text-sm font-body">{stats.topCourse.enrollments} enrollments</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm font-body">No courses available yet</p>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center shrink-0">
              <ShoppingBag className="text-blue-400" size={18} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white font-display uppercase tracking-wide">Marketplace Activity</h3>
          </div>
          {stats.marketplaceActivity ? (
            <div>
              <p className="text-white text-base font-medium mb-1 font-body">{stats.marketplaceActivity.topSeller}</p>
              <p className="text-gray-400 text-sm font-body">{stats.marketplaceActivity.downloads} downloads</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm font-body">No marketplace items yet</p>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center shrink-0">
            <Lightbulb className="text-yellow-400" size={18} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white font-display uppercase tracking-wide">Smart AI Suggestions</h3>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-white text-sm font-body">Consider launching a new Pro-tier course to increase subscription upgrades</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-white text-sm font-body">
              {stats.unpaidInvoices > 0 ? `Follow up on ${stats.unpaidInvoices} pending invoices` : 'All invoices are up to date'}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
