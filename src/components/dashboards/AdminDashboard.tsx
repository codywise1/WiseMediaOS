import { useEffect, useState } from 'react';
import { DollarSign, Users, BookOpen, ShoppingBag, TrendingUp, AlertCircle, Calendar, Lightbulb } from 'lucide-react';
import GlassCard from '../GlassCard';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalRevenue: number;
  subscriptions: {
    free: number;
    pro: number;
    elite: number;
  };
  topCourse: {
    title: string;
    enrollments: number;
  } | null;
  marketplaceActivity: {
    topSeller: string;
    downloads: number;
  } | null;
  upcomingAppointments: number;
  unpaidInvoices: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    subscriptions: { free: 0, pro: 0, elite: 0 },
    topCourse: null,
    marketplaceActivity: null,
    upcomingAppointments: 0,
    unpaidInvoices: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const [profilesRes, coursesRes, marketplaceRes, appointmentsRes, invoicesRes] = await Promise.all([
      supabase.from('profiles').select('role'),
      supabase.from('courses').select('title, enrollment_count').order('enrollment_count', { ascending: false }).limit(1),
      supabase.from('marketplace_items').select('title, downloads').order('downloads', { ascending: false }).limit(1),
      supabase.from('appointments').select('id').eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()),
      supabase.from('invoices').select('amount').eq('status', 'pending')
    ]);

    const subscriptions = {
      free: profilesRes.data?.filter(p => p.role === 'free').length || 0,
      pro: profilesRes.data?.filter(p => p.role === 'pro').length || 0,
      elite: profilesRes.data?.filter(p => p.role === 'elite').length || 0
    };

    const totalRevenue = invoicesRes.data?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

    setStats({
      totalRevenue,
      subscriptions,
      topCourse: coursesRes.data?.[0] ? {
        title: coursesRes.data[0].title,
        enrollments: coursesRes.data[0].enrollment_count
      } : null,
      marketplaceActivity: marketplaceRes.data?.[0] ? {
        topSeller: marketplaceRes.data[0].title,
        downloads: marketplaceRes.data[0].downloads
      } : null,
      upcomingAppointments: appointmentsRes.data?.length || 0,
      unpaidInvoices: invoicesRes.data?.length || 0
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Admin Dashboard
        </h1>
        <p className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
          WiseMediaOS Business Overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
              <DollarSign className="text-blue-400" size={24} />
            </div>
            <TrendingUp className="text-green-400" size={20} />
          </div>
          <h3 className="text-gray-400 mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            Total Revenue
          </h3>
          <p className="text-3xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
            ${stats.totalRevenue.toLocaleString()}
          </p>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
              <Users className="text-blue-400" size={24} />
            </div>
          </div>
          <h3 className="text-gray-400 mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            Total Members
          </h3>
          <p className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
            {stats.subscriptions.free + stats.subscriptions.pro + stats.subscriptions.elite}
          </p>
          <div className="flex gap-2 text-xs" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            <span className="text-gray-400">Free: {stats.subscriptions.free}</span>
            <span className="text-gray-400">Pro: {stats.subscriptions.pro}</span>
            <span className="text-gray-400">Elite: {stats.subscriptions.elite}</span>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
              <Calendar className="text-blue-400" size={24} />
            </div>
          </div>
          <h3 className="text-gray-400 mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            Upcoming Calls
          </h3>
          <p className="text-3xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
            {stats.upcomingAppointments}
          </p>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center">
              <AlertCircle className="text-red-400" size={24} />
            </div>
          </div>
          <h3 className="text-gray-400 mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            Unpaid Invoices
          </h3>
          <p className="text-3xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
            {stats.unpaidInvoices}
          </p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
              <BookOpen className="text-blue-400" size={20} />
            </div>
            <h3 className="text-xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase' }}>
              Top Course This Week
            </h3>
          </div>
          {stats.topCourse ? (
            <div>
              <p className="text-white text-lg font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                {stats.topCourse.title}
              </p>
              <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                {stats.topCourse.enrollments} enrollments
              </p>
            </div>
          ) : (
            <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
              No courses available yet
            </p>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
              <ShoppingBag className="text-blue-400" size={20} />
            </div>
            <h3 className="text-xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase' }}>
              Marketplace Activity
            </h3>
          </div>
          {stats.marketplaceActivity ? (
            <div>
              <p className="text-white text-lg font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                {stats.marketplaceActivity.topSeller}
              </p>
              <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                {stats.marketplaceActivity.downloads} downloads
              </p>
            </div>
          ) : (
            <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
              No marketplace items yet
            </p>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
            <Lightbulb className="text-yellow-400" size={20} />
          </div>
          <h3 className="text-xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase' }}>
            Smart AI Suggestions
          </h3>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-white text-sm" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
              Consider launching a new Pro-tier course to increase subscription upgrades
            </p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-white text-sm" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
              {stats.unpaidInvoices > 0 && `Follow up on ${stats.unpaidInvoices} pending invoices`}
              {stats.unpaidInvoices === 0 && 'All invoices are up to date'}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
