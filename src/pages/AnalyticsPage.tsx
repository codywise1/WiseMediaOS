import { useState, useEffect, useCallback, useRef } from 'react';
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
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Link2,
  FileText,
  ArrowRightLeft,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';

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
    bounceRate: number;
    bounceRatePct: number;
    pagesPerSession: number;
    pagesPerSessionPct: number;
    newUsers: number;
    newUsersPct: number;
    engagedSessions: number;
    engagementRate: number;
    eventsPerSession: number;
  };
  chart: { date: string; users: number; sessions: number; pageviews: number }[];
  topPages: { path: string; title: string; pageviews: number; avgTime: number }[];
  trafficSources: { medium: string; source: string; sessions: number; users: number }[];
  devices: { device: string; sessions: number; users: number }[];
  countries: { country: string; sessions: number; users: number }[];
  referrers: { source: string; sessions: number }[];
  newVsReturning: { type: string; users: number; sessions: number }[];
  landingPages: { path: string; sessions: number; pageviews: number; avgTime: number; bounceRate: number }[];
  searchConsole: {
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
    topQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
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

  const formatDuration = (seconds: number) => {
    const totalSeconds = Math.round(seconds);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const activationUrl = (() => {
    if (!error) return null;
    const m = error.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/[^\s"]+/);
    return m ? m[0] : null;
  })();

  const deviceIcon = (device: string) => {
    const d = device.toLowerCase();
    if (d.includes('mobile')) return <Smartphone className="h-4 w-4" />;
    if (d.includes('tablet')) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const totalSessions = gaData?.devices?.reduce((sum, d) => sum + d.sessions, 0) || 1;

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

            {/* Extended overview cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              <MetricCard
                label="Bounce Rate"
                value={`${(gaData.overview.bounceRate * 100).toFixed(1)}%`}
                pct={gaData.overview.bounceRatePct}
                icon={<ArrowRightLeft className="h-5 w-5" />}
                accent="yellow"
                invertPct
              />
              <MetricCard
                label="Pages / Session"
                value={String(gaData.overview.pagesPerSession)}
                pct={gaData.overview.pagesPerSessionPct}
                icon={<FileText className="h-5 w-5" />}
                accent="cyan"
              />
              <MetricCard
                label="New Users"
                value={formatNumber(gaData.overview.newUsers)}
                pct={gaData.overview.newUsersPct}
                icon={<Users className="h-5 w-5" />}
                accent="blue"
              />
              <MetricCard
                label="Engagement Rate"
                value={`${(gaData.overview.engagementRate * 100).toFixed(1)}%`}
                pct={gaData.overview.engagementRate !== undefined ? 0 : undefined}
                icon={<Zap className="h-5 w-5" />}
                accent="green"
                hidePct
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

                {/* Top search queries */}
                {gaData.searchConsole.topQueries?.length > 0 && (
                  <GlassCard className="p-4 sm:p-5">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-white font-display">Top Search Queries</h3>
                      <p className="text-xs text-gray-500 font-body mt-0.5">Queries driving traffic from Google Search</p>
                    </div>
                    <div className="space-y-2">
                      {gaData.searchConsole.topQueries.map((q, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex items-center justify-center h-6 w-6 rounded-md bg-[#3aa3eb]/15 text-[#3aa3eb] text-xs font-bold font-display shrink-0">
                              {i + 1}
                            </span>
                            <p className="text-sm font-medium text-white truncate font-body">{q.query}</p>
                          </div>
                          <div className="flex items-center gap-4 sm:gap-6 shrink-0 ml-3">
                            <div className="text-right">
                              <p className="text-xs text-gray-500 font-body">Clicks</p>
                              <p className="text-sm font-bold text-white font-display">{formatNumber(q.clicks)}</p>
                            </div>
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-gray-500 font-body">Impr.</p>
                              <p className="text-sm font-bold text-white font-display">{formatNumber(q.impressions)}</p>
                            </div>
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-gray-500 font-body">CTR</p>
                              <p className="text-sm font-bold text-white font-display">{q.ctr}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 font-body">Pos.</p>
                              <p className="text-sm font-bold text-white font-display">{q.position}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}
              </>
            )}

            {/* Visitors chart + Top pages */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <VisitorsChart chart={gaData.chart} formatDate={formatDate} />

              {/* Top pages */}
              <GlassCard className="lg:col-span-2 p-4 sm:p-5">
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
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-bold text-white font-display">{formatNumber(page.pageviews)}</p>
                          <p className="text-[10px] text-gray-500 font-body">{formatDuration(page.avgTime)}</p>
                        </div>
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

            {/* Traffic Sources + Devices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Traffic Sources */}
              <GlassCard className="p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-white font-display">Traffic Sources</h3>
                  <p className="text-xs text-gray-500 font-body mt-0.5">Where your visitors come from</p>
                </div>
                {gaData.trafficSources.length > 0 ? (
                  <div className="space-y-2">
                    {gaData.trafficSources.map((src, i) => {
                      const maxSessions = Math.max(...gaData.trafficSources.map(s => s.sessions), 1);
                      const barPct = (src.sessions / maxSessions) * 100;
                      return (
                        <div key={i} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-[#3aa3eb] font-display uppercase">{src.medium}</span>
                              <span className="text-sm text-gray-400 truncate font-body">· {src.source}</span>
                            </div>
                            <span className="text-sm font-bold text-white font-display shrink-0 ml-2">{formatNumber(src.sessions)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#3aa3eb] to-[#5bc0f0] transition-all duration-500"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 font-body py-6 text-center">No traffic source data</p>
                )}
              </GlassCard>

              {/* Devices */}
              <GlassCard className="p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-white font-display">Devices</h3>
                  <p className="text-xs text-gray-500 font-body mt-0.5">How visitors access your site</p>
                </div>
                {gaData.devices.length > 0 ? (
                  <div className="space-y-3">
                    {gaData.devices.map((dev, i) => {
                      const pct = Math.round((dev.sessions / totalSessions) * 100);
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-[#3aa3eb]/15 text-[#3aa3eb] shrink-0">
                            {deviceIcon(dev.device)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-white capitalize font-body">{dev.device}</span>
                              <span className="text-xs text-gray-400 font-body">{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#3aa3eb] to-[#5bc0f0] transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-bold text-white font-display shrink-0">{formatNumber(dev.sessions)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 font-body py-6 text-center">No device data</p>
                )}
              </GlassCard>
            </div>

            {/* Countries + New vs Returning */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Countries */}
              <GlassCard className="p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-white font-display">Top Countries</h3>
                  <p className="text-xs text-gray-500 font-body mt-0.5">Geographic distribution of sessions</p>
                </div>
                {gaData.countries.length > 0 ? (
                  <div className="space-y-2">
                    {gaData.countries.map((c, i) => {
                      const maxSessions = Math.max(...gaData.countries.map(co => co.sessions), 1);
                      const barPct = (c.sessions / maxSessions) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                          <MapPin className="h-4 w-4 text-[#3aa3eb] shrink-0" />
                          <span className="text-sm font-medium text-white truncate font-body flex-1">{c.country}</span>
                          <span className="text-sm font-bold text-white font-display shrink-0">{formatNumber(c.sessions)}</span>
                          <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#3aa3eb] to-[#5bc0f0] transition-all duration-500"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 font-body py-6 text-center">No country data</p>
                )}
              </GlassCard>

              {/* New vs Returning */}
              <GlassCard className="p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-white font-display">New vs Returning</h3>
                  <p className="text-xs text-gray-500 font-body mt-0.5">Visitor loyalty breakdown</p>
                </div>
                {gaData.newVsReturning.length > 0 ? (
                  <div className="space-y-4">
                    {gaData.newVsReturning.map((nr, i) => {
                      const totalUsers = gaData.newVsReturning.reduce((sum, n) => sum + n.users, 0) || 1;
                      const pct = Math.round((nr.users / totalUsers) * 100);
                      const isNew = nr.type.toLowerCase().includes('new');
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white capitalize font-body">{nr.type}</span>
                            <span className="text-sm font-bold text-white font-display">{formatNumber(nr.users)} ({pct}%)</span>
                          </div>
                          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isNew
                                  ? 'bg-gradient-to-r from-[#3aa3eb] to-[#5bc0f0]'
                                  : 'bg-gradient-to-r from-green-500 to-emerald-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 font-body mt-1">{formatNumber(nr.sessions)} sessions</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 font-body py-6 text-center">No data</p>
                )}
              </GlassCard>
            </div>

            {/* Referrers + Landing Pages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Referrers */}
              <GlassCard className="p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-white font-display">Top Referrers</h3>
                  <p className="text-xs text-gray-500 font-body mt-0.5">Sites linking to you</p>
                </div>
                {gaData.referrers.length > 0 ? (
                  <div className="space-y-2">
                    {gaData.referrers.map((ref, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Link2 className="h-4 w-4 text-[#3aa3eb] shrink-0" />
                          <p className="text-sm font-medium text-white truncate font-body">{ref.source}</p>
                        </div>
                        <span className="text-sm font-bold text-white font-display shrink-0 ml-3">{formatNumber(ref.sessions)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 font-body py-6 text-center">No referrer data</p>
                )}
              </GlassCard>

              {/* Landing Pages */}
              <GlassCard className="p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-white font-display">Top Landing Pages</h3>
                  <p className="text-xs text-gray-500 font-body mt-0.5">Entry points to your site</p>
                </div>
                {gaData.landingPages.length > 0 ? (
                  <div className="space-y-2">
                    {gaData.landingPages.map((lp, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-white truncate font-body">{lp.path}</p>
                          <span className="text-sm font-bold text-white font-display shrink-0 ml-3">{formatNumber(lp.sessions)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 font-body">
                          <span>{formatDuration(lp.avgTime)} avg</span>
                          <span>{lp.bounceRate}% bounce</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 font-body py-6 text-center">No landing page data</p>
                )}
              </GlassCard>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- iOS-style Visitors Chart ---------- */

type ChartMetric = 'users' | 'sessions' | 'pageviews';

const CHART_METRICS: { key: ChartMetric; label: string; color: string; gradientId: string }[] = [
  { key: 'users', label: 'Visitors', color: '#3aa3eb', gradientId: 'grad-users' },
  { key: 'sessions', label: 'Sessions', color: '#5bc0f0', gradientId: 'grad-sessions' },
  { key: 'pageviews', label: 'Pageviews', color: '#34d399', gradientId: 'grad-pageviews' },
];

function VisitorsChart({
  chart,
  formatDate,
}: {
  chart: GAData['chart'];
  formatDate: (s: string) => string;
}) {
  const [metric, setMetric] = useState<ChartMetric>('users');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(260);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      setWidth(el.clientWidth);
      setHeight(Math.max(el.clientHeight, 120));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const metricCfg = CHART_METRICS.find(m => m.key === metric)!;
  const values = chart.map(p => p[metric]);
  const maxVal = Math.max(...values, 1);
  const minVal = 0;
  const W = Math.max(width, 1);
  const H = Math.max(height, 120);
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const xStep = chart.length > 1 ? chartW / (chart.length - 1) : 0;
  const xPos = (i: number) => padL + i * xStep;
  const yScale = (v: number) => padT + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  // Smooth area path (Catmull-Rom → Bézier)
  const pts = chart.map((p, i) => ({ x: xPos(i), y: yScale(p[metric]) }));
  let linePath = '';
  if (pts.length === 1) {
    linePath = `M ${pts[0].x} ${pts[0].y}`;
  } else {
    linePath = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpx = (p0.x + p1.x) / 2;
      linePath += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
  }
  const areaPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1].x} ${padT + chartH} L ${pts[0].x} ${padT + chartH} Z`
    : '';

  const total = values.reduce((a, b) => a + b, 0);
  const avg = chart.length ? Math.round(total / chart.length) : 0;

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || chart.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < chart.length; i++) {
      const d = Math.abs(xPos(i) - px);
      if (d < bestDist) { bestDist = d; nearest = i; }
    }
    setHoverIdx(nearest);
  };

  return (
    <GlassCard className="lg:col-span-3 p-4 sm:p-5 flex flex-col h-full">
      {/* Header + metric switcher */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2 shrink-0">
        <div>
          <h3 className="text-base font-bold text-white font-display">{metricCfg.label}</h3>
          <p className="text-xs text-gray-500 font-body mt-0.5">
            Daily · last 28 days · avg {avg.toLocaleString()}
          </p>
        </div>
        <div className="ios-segmented">
          {CHART_METRICS.map(m => (
            <button
              key={m.key}
              className={`ios-segmented-btn ${metric === m.key ? 'active' : ''}`}
              onClick={() => { setMetric(m.key); setHoverIdx(null); }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="mt-3 relative flex-1 min-h-0">
        {chart.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500 font-body">No chart data</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="block"
            onPointerMove={handleMove}
            onPointerLeave={() => setHoverIdx(null)}
            style={{ touchAction: 'pan-y' }}
          >
            <defs>
              <linearGradient id={metricCfg.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metricCfg.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={metricCfg.color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const y = padT + chartH * frac;
              const val = Math.round(maxVal * (1 - frac));
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <text x={padL + 2} y={y - 4} fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="-apple-system, sans-serif">
                    {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            <path d={areaPath} fill={`url(#${metricCfg.gradientId})`} />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke={metricCfg.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover indicator */}
            {hoverIdx !== null && chart[hoverIdx] && (
              <g>
                <line
                  x1={xPos(hoverIdx)} y1={padT} x2={xPos(hoverIdx)} y2={padT + chartH}
                  stroke={metricCfg.color} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3"
                />
                <circle cx={xPos(hoverIdx)} cy={yScale(chart[hoverIdx][metric])} r="5" fill={metricCfg.color} stroke="#0b0d10" strokeWidth="2" />
              </g>
            )}

            {/* X-axis labels (first, middle, last) */}
            {chart.length > 0 && [0, Math.floor(chart.length / 2), chart.length - 1]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map(idx => (
                <text
                  key={idx}
                  x={xPos(idx)}
                  y={H - 6}
                  fill="rgba(255,255,255,0.3)"
                  fontSize="9"
                  fontFamily="-apple-system, sans-serif"
                  textAnchor={idx === 0 ? 'start' : idx === chart.length - 1 ? 'end' : 'middle'}
                >
                  {formatDate(chart[idx].date)}
                </text>
              ))}
          </svg>
        )}

        {/* Floating tooltip */}
        {hoverIdx !== null && chart[hoverIdx] && (
          <div
            className="absolute pointer-events-none z-10 bg-[#0b0d10]/95 border border-white/10 rounded-lg px-3 py-2 shadow-xl transition-opacity"
            style={{
              left: Math.min(Math.max(xPos(hoverIdx) / W * 100, 12), 88) + '%',
              top: 4,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="text-[10px] text-gray-400 font-body">{formatDate(chart[hoverIdx].date)}</p>
            <p className="text-sm font-bold text-white font-display">
              {chart[hoverIdx][metric].toLocaleString()} <span className="text-gray-500 font-body font-normal text-xs">{metricCfg.label}</span>
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

/* ---------- Metric Card ---------- */

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
  invertPct,
}: {
  label: string;
  value: string;
  pct?: number;
  icon: React.ReactNode;
  accent: keyof typeof accentMap;
  hidePct?: boolean;
  invertPct?: boolean;
}) {
  const a = accentMap[accent];
  const isGood = invertPct ? (pct ?? 0) <= 0 : (pct ?? 0) >= 0;
  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-gray-400 mb-1.5 text-xs sm:text-sm font-body truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-white font-display truncate">{value}</p>
          {!hidePct && pct !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isGood ? (
                <TrendingUp className="text-green-400" size={14} />
              ) : (
                <TrendingDown className="text-red-400" size={14} />
              )}
              <span className={`text-xs sm:text-sm font-medium ${isGood ? 'text-green-400' : 'text-red-400'}`}>
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
