import { useState, useEffect, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import PageHeader from '../components/PageHeader';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Eye,
  MousePointer,
  Search,
  AlertCircle,
  RefreshCw,
  Globe,
  ExternalLink,
} from 'lucide-react';
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

  const maxUsers = gaData?.chart?.length ? Math.max(...gaData.chart.map(p => p.users), 1) : 1;

  // Detect a "service disabled" style error to offer an activation link
  const activationUrl = (() => {
    if (!error) return null;
    const m = error.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/[^\s"]+/);
    return m ? m[0] : null;
  })();

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Analytics"
        subtitle="Track revenue, client growth, and Google site metrics."
        action={
          <button
            onClick={fetchGA}
            disabled={loading}
            className="btn-secondary !py-2.5 !px-4 text-sm w-full sm:w-auto disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* Google Site Metrics */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#3aa3eb]/15 border border-[#3aa3eb]/25">
            <Search className="h-4 w-4 text-[#3aa3eb]" />
          </div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest font-display">Google Site Metrics</h2>
          <span className="text-xs text-gray-500 font-body">· Last 28 days</span>
        </div>

        {loading && (
          <div className="glass-card rounded-2xl p-10 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-[#3aa3eb]/30 border-t-[#3aa3eb]" />
            <p className="text-sm text-gray-400 font-body">Loading Google metrics…</p>
          </div>
        )}

        {!loading && error && (
          <div className="glass-card rounded-2xl p-6 border border-red-500/25 bg-red-500/[0.04]">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-red-500/15 border border-red-500/25 shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-200 mb-1 font-display">Couldn't load Google metrics</p>
                <p className="text-xs text-red-300/70 font-body break-words">{error}</p>

                {activationUrl ? (
                  <a
                    href={activationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-[#3aa3eb] hover:text-[#5bc0f0] transition-colors font-body"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Enable the Google Analytics Data API
                  </a>
                ) : (
                  <p className="text-xs text-gray-400 mt-3 font-body">
                    Make sure <code className="text-[#3aa3eb]">GA4_PROPERTY_ID</code> and optionally{' '}
                    <code className="text-[#3aa3eb]">SEARCH_CONSOLE_SITE_URL</code> are set as edge function secrets.
                  </p>
                )}

                <button
                  onClick={fetchGA}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && gaData && (
          <div className="space-y-6">
            {/* Overview stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
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
                accent="cyan"
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
              <>
                <div className="flex items-center gap-2 px-1 pt-2">
                  <Globe className="h-4 w-4 text-[#3aa3eb]/70" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-display">Search Console</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
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
                    accent="cyan"
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
              </>
            )}

            {/* Visitors chart + Top pages */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Chart */}
              <GlassCard className="lg:col-span-3">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white font-display">Unique Visitors</h3>
                    <p className="text-xs text-gray-500 font-body mt-0.5">Daily · last 28 days</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-body">
                    <span className="h-2 w-2 rounded-full bg-[#3aa3eb]" />
                    Visitors
                  </div>
                </div>
                <div className="h-56 sm:h-64 flex items-end justify-between gap-[2px] sm:gap-1">
                  {gaData.chart.map((point, i) => {
                    const heightPct = Math.max((point.users / maxUsers) * 100, 2);
                    return (
                      <div
                        key={i}
                        className="flex-1 min-w-0 group relative"
                        style={{ height: '100%' }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-300 ease-out bg-gradient-to-t from-[#3aa3eb]/80 to-[#5bc0f0] group-hover:from-[#5bc0f0] group-hover:to-[#7dd3f5]"
                          style={{ height: `${heightPct}%` }}
                        />
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0f172a] border border-[#3aa3eb]/30 rounded-md px-2 py-1 text-[10px] text-white whitespace-nowrap pointer-events-none z-10 shadow-lg">
                          <span className="text-gray-400">{formatDate(point.date)}: </span>
                          <span className="font-semibold">{point.users}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {gaData.chart.length > 0 && (
                  <div className="flex justify-between mt-3 text-[10px] text-gray-500 font-body">
                    <span>{formatDate(gaData.chart[0].date)}</span>
                    <span>{formatDate(gaData.chart[gaData.chart.length - 1].date)}</span>
                  </div>
                )}
              </GlassCard>

              {/* Top pages */}
              <GlassCard className="lg:col-span-2">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-white font-display">Top Content</h3>
                  <p className="text-xs text-gray-500 font-body mt-0.5">Most viewed pages</p>
                </div>
                {gaData.topPages.length > 0 ? (
                  <div className="space-y-2">
                    {gaData.topPages.map((page, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex items-center justify-center h-6 w-6 rounded-md bg-[#3aa3eb]/15 text-[#3aa3eb] text-xs font-bold font-display shrink-0">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate font-body">{page.title || page.path}</p>
                            <p className="text-xs text-gray-500 truncate font-body">{page.path}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white shrink-0 ml-3 font-display">{formatNumber(page.pageviews)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Eye className="h-8 w-8 text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 font-body">No page data yet</p>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        )}
      </section>

      {/* Business Performance */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#3aa3eb]/15 border border-[#3aa3eb]/25">
            <BarChart3 className="h-4 w-4 text-[#3aa3eb]" />
          </div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest font-display">Business Performance</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <BusinessMetric
            label="Revenue"
            value="$45,231"
            pct={12.5}
            icon={<BarChart3 className="h-5 w-5" />}
            accent="green"
          />
          <BusinessMetric
            label="New Clients"
            value="23"
            pct={8.2}
            icon={<Users className="h-5 w-5" />}
            accent="blue"
          />
          <BusinessMetric
            label="Active Projects"
            value="12"
            pct={-3.1}
            icon={<BarChart3 className="h-5 w-5" />}
            accent="cyan"
          />
          <BusinessMetric
            label="Avg. Project Value"
            value="$3,769"
            pct={5.4}
            icon={<BarChart3 className="h-5 w-5" />}
            accent="yellow"
          />
        </div>
      </section>
    </div>
  );
}

const accentMap = {
  blue:   { bg: 'bg-[#3aa3eb]/15',  text: 'text-[#3aa3eb]',  ring: 'ring-[#3aa3eb]/25' },
  green:  { bg: 'bg-green-500/15',  text: 'text-green-400',  ring: 'ring-green-500/25' },
  cyan:   { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   ring: 'ring-cyan-500/25' },
  yellow: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', ring: 'ring-yellow-500/25' },
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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-gray-400 mb-1.5 text-xs sm:text-sm font-body truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-white font-display truncate">{value}</p>
          {!hidePct && pct !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {pct >= 0 ? (
                <TrendingUp className="text-green-400" size={14} />
              ) : (
                <TrendingDown className="text-red-400" size={14} />
              )}
              <span className={`text-xs sm:text-sm font-medium ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {pct >= 0 ? '+' : ''}{pct}%
              </span>
              <span className="text-[10px] text-gray-600 font-body ml-0.5">vs prev. 28d</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${a.bg} ring-1 ${a.ring}`}>
          <span className={a.text}>{icon}</span>
        </div>
      </div>
    </GlassCard>
  );
}

function BusinessMetric({
  label,
  value,
  pct,
  icon,
  accent,
}: {
  label: string;
  value: string;
  pct: number;
  icon: React.ReactNode;
  accent: keyof typeof accentMap;
}) {
  const a = accentMap[accent];
  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-gray-400 mb-1.5 text-xs sm:text-sm font-body truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-white font-display truncate">{value}</p>
          <div className="flex items-center gap-1 mt-2">
            {pct >= 0 ? (
              <TrendingUp className="text-green-400" size={14} />
            ) : (
              <TrendingDown className="text-red-400" size={14} />
            )}
            <span className={`text-xs sm:text-sm font-medium ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {pct >= 0 ? '+' : ''}{pct}%
            </span>
          </div>
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${a.bg} ring-1 ${a.ring}`}>
          <span className={a.text}>{icon}</span>
        </div>
      </div>
    </GlassCard>
  );
}
