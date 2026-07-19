import { useState, useEffect, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import PageHeader from '../components/PageHeader';
import { BarChart3, TrendingUp, TrendingDown, Users, Clock, Eye, MousePointer, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GAData {
  overview: {
    visitors: number;
    visitorsPct: number;
    avgDuration: string;
    avgDurationPct: number;
    pageviews: number;
    pageviewsPct: number;
    sessions: number;
    sessionsPct: number;
  };
  chart: { date: string; users: number }[];
  topPages: { path: string; title: string; pageviews: number }[];
  searchConsole: {
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  } | null;
}

export default function AnalyticsPage() {
  const [gaData, setGaData] = useState<GAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGA = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = supabase;
      if (!sb) throw new Error('Supabase client not initialized.');
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated. Please log in to view Google metrics.');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-analytics`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGaData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGA();
  }, [fetchGA]);

  const formatNumber = (n: number) => n.toLocaleString();

  const formatDate = (yyyymmdd: string) => {
    const y = yyyymmdd.slice(0, 4);
    const m = yyyymmdd.slice(4, 6);
    const d = yyyymmdd.slice(6, 8);
    return new Date(`${y}-${m}-${d}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const maxUsers = gaData?.chart?.length ? Math.max(...gaData.chart.map(p => p.users)) : 1;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Analytics"
        subtitle="Track revenue, client growth, and Google site metrics."
        icon={<BarChart3 className="h-5 w-5" />}
        action={
          <button
            onClick={fetchGA}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all w-full sm:w-auto disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* Google Site Kit metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Search className="h-5 w-5 text-[#3aa3eb]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest font-display">Google Site Metrics</h2>
          <span className="text-xs text-gray-500 font-body">· Last 28 days</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3aa3eb]"></div>
          </div>
        )}

        {!loading && error && (
          <div className="glass-card rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-200 mb-1">Couldn't load Google metrics</p>
                <p className="text-xs text-red-300/80 font-body">{error}</p>
                <p className="text-xs text-gray-400 mt-2 font-body">
                  Make sure <code className="text-[#3aa3eb]">GA4_PROPERTY_ID</code> and optionally{' '}
                  <code className="text-[#3aa3eb]">SEARCH_CONSOLE_SITE_URL</code> are set as edge function secrets.
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && gaData && (
          <div className="space-y-6">
            {/* Overview stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <MetricCard
                label="Unique Visitors"
                value={formatNumber(gaData.overview.visitors)}
                pct={gaData.overview.visitorsPct}
                icon={<Users className="h-5 w-5" />}
                accent="blue"
              />
              <MetricCard
                label="Avg. Time on Site"
                value={gaData.overview.avgDuration}
                pct={gaData.overview.avgDurationPct}
                icon={<Clock className="h-5 w-5" />}
                accent="green"
              />
              <MetricCard
                label="Pageviews"
                value={formatNumber(gaData.overview.pageviews)}
                pct={gaData.overview.pageviewsPct}
                icon={<Eye className="h-5 w-5" />}
                accent="purple"
              />
              <MetricCard
                label="Sessions"
                value={formatNumber(gaData.overview.sessions)}
                pct={gaData.overview.sessionsPct}
                icon={<BarChart3 className="h-5 w-5" />}
                accent="yellow"
              />
            </div>

            {/* Search Console stats */}
            {gaData.searchConsole && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <MetricCard
                  label="Impressions"
                  value={formatNumber(gaData.searchConsole.impressions)}
                  icon={<Eye className="h-5 w-5" />}
                  accent="blue"
                  hidePct
                />
                <MetricCard
                  label="Clicks"
                  value={formatNumber(gaData.searchConsole.clicks)}
                  icon={<MousePointer className="h-5 w-5" />}
                  accent="green"
                  hidePct
                />
                <MetricCard
                  label="CTR"
                  value={`${gaData.searchConsole.ctr}%`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  accent="purple"
                  hidePct
                />
                <MetricCard
                  label="Avg. Position"
                  value={String(gaData.searchConsole.position)}
                  icon={<Search className="h-5 w-5" />}
                  accent="yellow"
                  hidePct
                />
              </div>
            )}

            {/* Visitors chart */}
            <GlassCard>
              <h3 className="text-base font-bold text-white mb-6 font-display">Unique Visitors · Daily</h3>
              <div className="h-56 sm:h-64 flex items-end justify-between gap-1 sm:gap-1.5">
                {gaData.chart.map((point, i) => (
                  <div
                    key={i}
                    className="flex-1 min-w-0 group relative bg-gradient-to-t from-[#3aa3eb] to-[#5bc0f0] rounded-t-md transition-all hover:from-[#5bc0f0] hover:to-[#7dd3f5]"
                    style={{ height: `${Math.max((point.users / maxUsers) * 100, 2)}%` }}
                    title={`${formatDate(point.date)}: ${point.users} visitors`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0f172a] border border-[#3aa3eb]/30 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap pointer-events-none z-10">
                      {point.users}
                    </div>
                  </div>
                ))}
              </div>
              {gaData.chart.length > 0 && (
                <div className="flex justify-between mt-3 text-[10px] text-gray-500 font-body">
                  <span>{formatDate(gaData.chart[0].date)}</span>
                  <span>{formatDate(gaData.chart[gaData.chart.length - 1].date)}</span>
                </div>
              )}
            </GlassCard>

            {/* Top pages */}
            {gaData.topPages.length > 0 && (
              <GlassCard>
                <h3 className="text-base font-bold text-white mb-4 font-display">Top Content</h3>
                <div className="space-y-2">
                  {gaData.topPages.map((page, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-[#3aa3eb] w-6 shrink-0 font-display">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate font-body">{page.title || page.path}</p>
                          <p className="text-xs text-gray-500 truncate font-body">{page.path}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-white shrink-0 ml-3 font-display">{formatNumber(page.pageviews)}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        )}
      </div>

      {/* Existing business metrics below */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <BarChart3 className="h-5 w-5 text-[#3aa3eb]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest font-display">Business Performance</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1 text-xs sm:text-sm font-body">Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-white font-display">$45,231</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="text-green-400" size={14} />
                  <span className="text-green-400 text-xs sm:text-sm">+12.5%</span>
                </div>
              </div>
              <div className="p-2.5 sm:p-3 bg-green-500/20 rounded-lg shrink-0">
                <BarChart3 className="text-green-400" size={20} />
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1 text-xs sm:text-sm font-body">New Clients</p>
                <p className="text-xl sm:text-2xl font-bold text-white font-display">23</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="text-green-400" size={14} />
                  <span className="text-green-400 text-xs sm:text-sm">+8.2%</span>
                </div>
              </div>
              <div className="p-2.5 sm:p-3 bg-blue-500/20 rounded-lg shrink-0">
                <Users className="text-blue-400" size={20} />
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1 text-xs sm:text-sm font-body">Active Projects</p>
                <p className="text-xl sm:text-2xl font-bold text-white font-display">12</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingDown className="text-red-400" size={14} />
                  <span className="text-red-400 text-xs sm:text-sm">-3.1%</span>
                </div>
              </div>
              <div className="p-2.5 sm:p-3 bg-purple-500/20 rounded-lg shrink-0">
                <BarChart3 className="text-purple-400" size={20} />
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1 text-xs sm:text-sm font-body">Avg. Project Value</p>
                <p className="text-xl sm:text-2xl font-bold text-white font-display">$3,769</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="text-green-400" size={14} />
                  <span className="text-green-400 text-xs sm:text-sm">+5.4%</span>
                </div>
              </div>
              <div className="p-2.5 sm:p-3 bg-yellow-500/20 rounded-lg shrink-0">
                <BarChart3 className="text-yellow-400" size={20} />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

const accentMap = {
  blue: { bg: 'bg-[#3aa3eb]/20', text: 'text-[#3aa3eb]' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
};

function MetricCard({
  label,
  value,
  pct,
  icon,
  accent,
  hidePct,
}: {
  label: string;
  value: string;
  pct?: number;
  icon: React.ReactNode;
  accent: keyof typeof accentMap;
  hidePct?: boolean;
}) {
  const a = accentMap[accent];
  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-gray-400 mb-1 text-xs sm:text-sm font-body truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-white font-display truncate">{value}</p>
          {!hidePct && pct !== undefined && (
            <div className="flex items-center gap-1 mt-1.5">
              {pct >= 0 ? (
                <TrendingUp className="text-green-400" size={14} />
              ) : (
                <TrendingDown className="text-red-400" size={14} />
              )}
              <span className={`text-xs sm:text-sm ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {pct >= 0 ? '+' : ''}{pct}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-2.5 sm:p-3 rounded-lg shrink-0 ${a.bg}`}>
          <span className={a.text}>{icon}</span>
        </div>
      </div>
    </GlassCard>
  );
}
