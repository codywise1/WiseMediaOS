import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  projectService,
  invoiceService,
  meetingService,
  appointmentService,
  clientService,
  UserRole
} from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import {
  DollarSign,
  FileText,
  CheckCircle2,
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Plus,
  Sparkles,
  Calendar,
  ChevronRight,
  Globe,
} from 'lucide-react';
import BrandLogo from './BrandLogo';

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface DashboardProps {
  currentUser: User | null;
}

type Timeframe = '7d' | '30d' | 'quarter' | 'year';

const QUICK_LINKS = [
  { label: 'My Website', url: 'https://wisemedia.io', icon: null, brand: null, color: 'text-[#3aa3eb]', bg: 'bg-[#3aa3eb]/15' },
  { label: 'X (Twitter)', url: 'https://x.com/WiseMedia33', icon: null, brand: 'x' as const, color: 'text-white', bg: 'bg-white/10' },
  { label: 'Instagram', url: 'https://wisemedia.io', icon: null, brand: 'instagram' as const, color: 'text-pink-400', bg: 'bg-pink-500/15' },
  { label: 'YouTube', url: 'https://www.youtube.com/@CodyConsultant', icon: null, brand: 'youtube' as const, color: 'text-red-400', bg: 'bg-red-500/15' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/cody-wise-3a76a4168/', icon: null, brand: 'linkedin' as const, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  { label: 'Facebook', url: 'https://www.facebook.com/wisemedia.io/', icon: null, brand: 'facebook' as const, color: 'text-blue-300', bg: 'bg-blue-600/15' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
};

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

function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

function isSameMonth(a: Date, b: Date) {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function isSameQuarter(a: Date, b: Date) {
  return Math.floor(a.getMonth() / 3) === Math.floor(b.getMonth() / 3) && a.getFullYear() === b.getFullYear();
}

function isSameYear(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear();
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ChartPoint {
  label: string;
  value: number;
  date: Date;
}

function buildChartData(invoices: any[], timeframe: Timeframe): ChartPoint[] {
  const now = new Date();
  const paid = invoices.filter((i) => i.status === 'paid' && (i.paid_at || i.issued_at || i.created_at));
  const points: ChartPoint[] = [];

  const revenueDate = (inv: any) => new Date(inv.paid_at || inv.issued_at || inv.created_at);

  if (timeframe === '7d') {
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const total = paid
        .filter((inv) => {
          const d = revenueDate(inv);
          return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
        })
        .reduce((s, i) => s + i.amount, 0);
      points.push({ label: day.toLocaleDateString('en-US', { weekday: 'short' }), value: total, date: day });
    }
  } else if (timeframe === '30d') {
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const total = paid
        .filter((inv) => {
          const d = revenueDate(inv);
          return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
        })
        .reduce((s, i) => s + i.amount, 0);
      points.push({ label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: total, date: day });
    }
  } else if (timeframe === 'quarter') {
    const start = startOfQuarter(now);
    const months: Date[] = [];
    for (let m = 0; m < 3; m++) {
      months.push(new Date(start.getFullYear(), start.getMonth() + m, 1));
    }
    for (const monthStart of months) {
      const total = paid.filter((inv) => isSameMonth(revenueDate(inv), monthStart)).reduce((s, i) => s + i.amount, 0);
      points.push({ label: MONTH_ABBR[monthStart.getMonth()], value: total, date: monthStart });
    }
  } else {
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(now.getFullYear(), m, 1);
      const total = paid.filter((inv) => isSameMonth(revenueDate(inv), monthStart)).reduce((s, i) => s + i.amount, 0);
      points.push({ label: MONTH_ABBR[m], value: total, date: monthStart });
    }
  }

  return points;
}

export default function Dashboard({ currentUser }: DashboardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [recentActivities, setRecentActivities] = React.useState<any[]>([]);
  const [allInvoices, setAllInvoices] = React.useState<any[]>([]);
  const [timeframe, setTimeframe] = React.useState<Timeframe>('30d');
  const [stats, setStats] = React.useState({
    activeProjects: 0,
    completedProjects: 0,
    totalProjects: 0,
    monthlyRevenue: 0,
    lastMonthRevenue: 0,
    quarterRevenue: 0,
    yearRevenue: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    invoicesPaidThisMonth: 0,
    invoicesPaidThisMonthCount: 0,
    dealsSignedThisMonth: 0,
    upcomingAppointments: 0,
    activeClients: 0,
    totalInvoices: 0,
  });

  const hasLoadedRef = React.useRef(false);

  React.useEffect(() => {
    loadDashboardData();
  }, [currentUser?.id, currentUser?.role]);

  const formatActivityTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatAppDate(date);
  };

  const buildRecentActivities = (projects: any[], invoices: any[], appointments: any[]) => {
    const activities: any[] = [];
    projects.forEach((p) => {
      if (!p) return;
      const date = new Date(p.updated_at || p.created_at || Date.now());
      activities.push({
        id: `project-${p.id}`,
        icon: Briefcase,
        status: p.status === 'completed' ? 'completed' : 'pending',
        title: p.status === 'completed' ? `"${p.name}" completed` : `"${p.name}" updated`,
        subtitle: p.client?.name || '',
        time: formatActivityTime(date),
        timestamp: date.getTime(),
        route: '/projects',
      });
    });
    invoices.forEach((inv) => {
      if (!inv) return;
      const date = new Date(inv.created_at || Date.now());
      const status = inv.status;
      activities.push({
        id: `invoice-${inv.id}`,
        icon: FileText,
        status: status === 'paid' ? 'success' : status === 'pending' ? 'pending' : status === 'overdue' ? 'error' : 'pending',
        title: `Invoice ${formatCurrency(inv.amount)} · ${inv.client?.name || 'Client'}`,
        subtitle: status,
        time: formatActivityTime(date),
        timestamp: date.getTime(),
        route: '/invoices',
      });
    });
    appointments.forEach((appt) => {
      if (!appt) return;
      const dateStr = `${appt.appointment_date}T${appt.appointment_time || '00:00'}`;
      const date = new Date(dateStr);
      activities.push({
        id: `appointment-${appt.id}`,
        icon: Clock,
        status: appt.status === 'confirmed' ? 'success' : 'pending',
        title: `Call with ${appt.client?.name || 'Client'}`,
        subtitle: appt.type || '',
        time: formatActivityTime(date),
        timestamp: date.getTime(),
        route: '/meetings',
      });
    });
    activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    setRecentActivities(activities.slice(0, 6));
  };

  const loadDashboardData = async () => {
    const isFirstLoad = !hasLoadedRef.current;
    const safetyTimeout = setTimeout(() => {
      if (isFirstLoad) setLoading(false);
    }, 6000);
    try {
      if (isFirstLoad) setLoading(true);
      try {
        if (currentUser?.role === 'admin') {
          const [projects, invoices, meetings, clients] = await Promise.all([
            projectService.getAll(),
            invoiceService.getAll(),
            meetingService.getAll(),
            clientService.getAll(),
          ]);
          setAllInvoices(invoices);
          const now = new Date();
          const upcomingAppointments = meetings.filter((m: any) => new Date(m.meeting_date || m.created_at) >= now).length;

          const revenueDate = (inv: any) => new Date(inv.paid_at || inv.issued_at || inv.created_at);
          const monthlyRevenue = invoices
            .filter((inv: any) => inv.status === 'paid' && isSameMonth(revenueDate(inv), now))
            .reduce((s: number, i: any) => s + i.amount, 0);
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthRevenue = invoices
            .filter((inv: any) => inv.status === 'paid' && isSameMonth(revenueDate(inv), lastMonth))
            .reduce((s: number, i: any) => s + i.amount, 0);
          const quarterRevenue = invoices
            .filter((inv: any) => inv.status === 'paid' && isSameQuarter(revenueDate(inv), now))
            .reduce((s: number, i: any) => s + i.amount, 0);
          const yearRevenue = invoices
            .filter((inv: any) => inv.status === 'paid' && isSameYear(revenueDate(inv), now))
            .reduce((s: number, i: any) => s + i.amount, 0);
          const pendingInvoices = invoices.filter((i: any) => i.status === 'pending').reduce((s: number, i: any) => s + i.amount, 0);
          const overdueInvoices = invoices.filter((i: any) => i.status === 'overdue').reduce((s: number, i: any) => s + i.amount, 0);
          const paidThisMonth = invoices.filter((i: any) => i.status === 'paid' && isSameMonth(revenueDate(i), now));
          const dealsSignedThisMonth = projects.filter((p: any) => isSameMonth(new Date(p.created_at), now) && p.status !== 'cancelled').length;
          const activeProjects = projects.filter((p: any) => p.status === 'in_progress' || p.status === 'in_review').length;
          const completedProjects = projects.filter((p: any) => p.status === 'completed').length;

          setStats({
            activeProjects, completedProjects, totalProjects: projects.length,
            monthlyRevenue, lastMonthRevenue, quarterRevenue, yearRevenue,
            pendingInvoices, overdueInvoices,
            invoicesPaidThisMonth: paidThisMonth.reduce((s: number, i: any) => s + i.amount, 0),
            invoicesPaidThisMonthCount: paidThisMonth.length,
            dealsSignedThisMonth, upcomingAppointments, activeClients: clients.length, totalInvoices: invoices.length,
          });
          buildRecentActivities(projects as any[], invoices as any[], meetings as any[]);
        } else if (currentUser?.id) {
          const clientRecord = await clientService.getByEmail(currentUser.email).catch(() => null);
          const effectiveClientId = clientRecord?.id || currentUser.id;
          const [projects, invoices, appointments] = await Promise.all([
            projectService.getByClientId(effectiveClientId),
            invoiceService.getByClientId(effectiveClientId),
            appointmentService.getByClientId(effectiveClientId),
          ]);
          setAllInvoices(invoices);
          const pendingInvoices = invoices.filter((i: any) => i.status === 'pending').reduce((s: number, i: any) => s + i.amount, 0);
          setStats((s) => ({
            ...s,
            activeProjects: projects.filter((p: any) => p.status === 'in_progress' || p.status === 'in_review').length,
            completedProjects: projects.filter((p: any) => p.status === 'completed').length,
            totalProjects: projects.length,
            pendingInvoices, totalInvoices: invoices.length, upcomingAppointments: appointments.length,
          }));
          buildRecentActivities(projects as any[], invoices as any[], appointments as any[]);
        }
      } catch (dbError) {
        console.log('Database not available:', dbError);
        if (isFirstLoad) setRecentActivities([]);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      if (isFirstLoad) setRecentActivities([]);
    } finally {
      clearTimeout(safetyTimeout);
      if (isFirstLoad) { setLoading(false); hasLoadedRef.current = true; }
    }
  };

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const revenueChange = calcChange(stats.monthlyRevenue, stats.lastMonthRevenue);
  const chartData = React.useMemo(() => buildChartData(allInvoices, timeframe), [allInvoices, timeframe]);
  const maxChart = Math.max(...chartData.map((p) => p.value), 1);
  const totalChart = chartData.reduce((s, p) => s + p.value, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 border-2 border-white/10 border-t-[#3aa3eb] rounded-full"
        />
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const quarterLabel = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 sm:space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <p className="text-sm text-gray-500 font-medium mb-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-wide leading-none" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>
          {getGreeting()}, Mr. {getLastName(currentUser?.name)}
        </h1>
        <p className="text-gray-400 mt-2 text-sm sm:text-base">
          {isAdmin ? "Here's your business at a glance." : "Here's your project overview."}
        </p>
      </motion.div>

      {/* Quick Links — socials + website */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Links</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {QUICK_LINKS.map((link) => (
            <motion.a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="glass-card rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 group"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center ${link.bg} group-hover:scale-110 transition-transform`}>
                {link.brand ? (
                  <BrandLogo name={link.brand} size={20} className={link.color} />
                ) : (
                  <Globe className={link.color} size={20} />
                )}
              </div>
              <span className="text-[10px] sm:text-xs text-gray-400 font-medium text-center leading-tight">{link.label}</span>
            </motion.a>
          ))}
        </div>
      </motion.div>

      {/* Revenue Chart — iOS style */}
      {isAdmin && (
        <motion.div variants={itemVariants} className="glass-card rounded-3xl p-5 sm:p-7">
          <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Monthly Revenue</h2>
              <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight tabular-nums">{formatCurrency(totalChart)}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {timeframe === '7d' && 'Last 7 days'}
                {timeframe === '30d' && 'Last 30 days'}
                {timeframe === 'quarter' && quarterLabel}
                {timeframe === 'year' && `${new Date().getFullYear()} YTD`}
              </p>
            </div>
            <div
              className="flex items-center gap-0.5 p-0.5 rounded-full"
              style={{ background: 'rgba(120, 120, 128, 0.16)' }}
            >
              {(['7d', '30d', 'quarter', 'year'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className="relative px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={{ color: timeframe === tf ? '#fff' : 'rgba(255,255,255,0.4)' }}
                >
                  {timeframe === tf && (
                    <motion.div
                      layoutId="timeframePill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'linear-gradient(180deg, #3aa3eb 0%, #2d8fd4 100%)', boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 0 12px rgba(58,163,235,0.25)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    />
                  )}
                  <span className="relative z-10">
                    {tf === '7d' ? '1W' : tf === '30d' ? '1M' : tf === 'quarter' ? '1Q' : '1Y'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <RevenueLineChart data={chartData} />
        </motion.div>
      )}

      {/* This Quarter Snapshot */}
      {isAdmin && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{quarterLabel}</h2>
            <button onClick={() => navigate('/invoices')} className="text-xs text-[#3aa3eb] hover:text-[#59a1e5] font-medium flex items-center gap-1">
              Details <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <SnapshotCard
              icon={<DollarSign size={18} />}
              iconBg="bg-emerald-500/15 text-emerald-400"
              value={formatCurrency(stats.quarterRevenue)}
              label="Revenue collected"
              pill={revenueChange !== 0 ? { value: revenueChange, positive: revenueChange > 0 } : undefined}
            />
            <SnapshotCard
              icon={<Briefcase size={18} />}
              iconBg="bg-[#3aa3eb]/15 text-[#3aa3eb]"
              value={stats.dealsSignedThisMonth.toString()}
              label="Deals signed"
            />
            <SnapshotCard
              icon={<CheckCircle2 size={18} />}
              iconBg="bg-violet-500/15 text-violet-400"
              value={stats.invoicesPaidThisMonthCount.toString()}
              label={`Invoices paid · ${formatCurrency(stats.invoicesPaidThisMonth)}`}
            />
          </div>
        </motion.div>
      )}

      {/* This Year Snapshot */}
      {isAdmin && (
        <motion.div variants={itemVariants}>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{new Date().getFullYear()} YTD</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <SnapshotCard
              icon={<TrendingUp size={18} />}
              iconBg="bg-emerald-500/15 text-emerald-400"
              value={formatCurrency(stats.yearRevenue)}
              label="Annual revenue"
            />
            <SnapshotCard
              icon={<Users size={18} />}
              iconBg="bg-[#3aa3eb]/15 text-[#3aa3eb]"
              value={stats.activeClients.toString()}
              label="Active clients"
            />
            <SnapshotCard
              icon={<FileText size={18} />}
              iconBg="bg-violet-500/15 text-violet-400"
              value={stats.totalInvoices.toString()}
              label="Total invoices"
            />
          </div>
        </motion.div>
      )}

      {/* Overview Stats */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile icon={Briefcase} label="Active Projects" value={stats.activeProjects.toString()} sub={`${stats.completedProjects} completed`} color="blue" onClick={() => navigate('/projects')} />
          <StatTile icon={DollarSign} label="Outstanding" value={formatCurrency(stats.pendingInvoices)} sub={stats.overdueInvoices > 0 ? `${formatCurrency(stats.overdueInvoices)} overdue` : 'No overdue'} color={stats.overdueInvoices > 0 ? 'red' : 'neutral'} onClick={() => navigate('/invoices')} />
          <StatTile icon={Clock} label="Upcoming Calls" value={stats.upcomingAppointments.toString()} sub="Scheduled" color="blue" onClick={() => navigate('/meetings')} />
          {isAdmin ? (
            <StatTile icon={Users} label="Active Clients" value={stats.activeClients.toString()} sub={`${stats.totalProjects} projects total`} color="neutral" onClick={() => navigate('/clients')} />
          ) : (
            <StatTile icon={FileText} label="Total Invoices" value={stats.totalInvoices.toString()} sub={`${stats.completedProjects} done`} color="neutral" onClick={() => navigate('/invoices')} />
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
          <QuickActionRow icon={Plus} label="New Project" sub="Start a new client project" onClick={() => navigate('/projects')} />
          <QuickActionRow icon={FileText} label="Create Invoice" sub="Bill a client for work completed" onClick={() => navigate('/invoices')} />
          <QuickActionRow icon={Calendar} label="Schedule Meeting" sub="Book a call with a client" onClick={() => navigate('/meetings')} />
          {isAdmin && <QuickActionRow icon={Sparkles} label="New Proposal" sub="Draft a proposal for a prospect" onClick={() => navigate('/proposals')} />}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Activity</h2>
        <div className="glass-card rounded-2xl overflow-hidden">
          {recentActivities.length > 0 ? (
            <div className="divide-y divide-white/5">
              <AnimatePresence>
                {recentActivities.map((activity, i) => (
                  <motion.button
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    onClick={() => navigate(activity.route)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      activity.status === 'completed' || activity.status === 'success' ? 'bg-emerald-500/15' :
                      activity.status === 'pending' ? 'bg-amber-500/15' :
                      activity.status === 'error' ? 'bg-red-500/15' : 'bg-white/5'
                    }`}>
                      <activity.icon className={
                        activity.status === 'completed' || activity.status === 'success' ? 'text-emerald-400' :
                        activity.status === 'pending' ? 'text-amber-400' :
                        activity.status === 'error' ? 'text-red-400' : 'text-gray-400'
                      } size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{activity.title}</p>
                      {activity.subtitle && <p className="text-xs text-gray-500 truncate">{activity.subtitle}</p>}
                    </div>
                    <span className="text-xs text-gray-600 shrink-0">{activity.time}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-500 text-sm">No recent activity yet</p>
              <p className="text-gray-600 text-xs mt-1">Activity will appear as you use the platform</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── iOS-style SVG line chart ──────────────────────────────────────────────
const CHART_H = 160;
const Y_LABEL_W = 40;
const X_LABEL_H = 28;
const DOT_R = 4;
const GRID_LINES = 4;

function niceMax(v: number) {
  if (v === 0) return 1000;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

function fmtYLabel(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${v}`;
}

function RevenueLineChart({ data }: { data: ChartPoint[] }) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(600);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const maxVal = niceMax(Math.max(...data.map((p) => p.value), 0));
  const plotW = width - Y_LABEL_W;
  const n = data.length;

  const xOf = (i: number) => Y_LABEL_W + (plotW / n) * (i + 0.5);
  const yOf = (v: number) => CHART_H - (v / maxVal) * CHART_H;

  const linePath = data.map((p, i) => {
    const x = xOf(i);
    const y = yOf(p.value);
    if (i === 0) return `M${x},${y}`;
    const px = xOf(i - 1);
    const py = yOf(data[i - 1].value);
    const cpx = (px + x) / 2;
    return `C${cpx},${py} ${cpx},${y} ${x},${y}`;
  }).join(' ');

  const firstX = xOf(0);
  const lastX = xOf(n - 1);
  const areaPath = linePath + ` L${lastX},${CHART_H} L${firstX},${CHART_H} Z`;

  const maxLabels = Math.min(n, Math.floor(plotW / 48));
  const step = n <= maxLabels ? 1 : Math.ceil(n / maxLabels);
  const showLabel = (i: number) => i % step === 0 || i === n - 1;

  const totalH = CHART_H + X_LABEL_H;
  const gradId = 'chartFill';
  const clipId = 'chartClip';

  return (
    <div ref={containerRef} className="w-full select-none">
      <svg
        width={width}
        height={totalH}
        style={{ overflow: 'visible', display: 'block' }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3aa3eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3aa3eb" stopOpacity="0" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x={Y_LABEL_W} y={0} width={plotW} height={CHART_H} />
          </clipPath>
        </defs>

        {Array.from({ length: GRID_LINES + 1 }).map((_, gi) => {
          const frac = gi / GRID_LINES;
          const y = CHART_H - frac * CHART_H;
          const val = frac * maxVal;
          return (
            <g key={gi}>
              <line
                x1={Y_LABEL_W} y1={y} x2={width} y2={y}
                stroke="rgba(255,255,255,0.06)" strokeWidth={1}
              />
              <text
                x={Y_LABEL_W - 6} y={y}
                textAnchor="end" dominantBaseline="middle"
                fill="rgba(255,255,255,0.3)" fontSize={10}
              >
                {fmtYLabel(val)}
              </text>
            </g>
          );
        })}

        <motion.path
          d={areaPath}
          fill={`url(#${gradId})`}
          clipPath={`url(#${clipId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        <motion.path
          d={linePath}
          fill="none"
          stroke="#3aa3eb"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          clipPath={`url(#${clipId})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />

        {hovered !== null && (
          <line
            x1={xOf(hovered)} y1={0} x2={xOf(hovered)} y2={CHART_H}
            stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4 3"
          />
        )}

        {data.map((p, i) => {
          const x = xOf(i);
          const y = yOf(p.value);
          const isHov = hovered === i;
          return (
            <g key={i}>
              <rect
                x={xOf(i) - plotW / n / 2} y={0}
                width={plotW / n} height={CHART_H}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
              />
              <circle
                cx={x} cy={y} r={isHov ? DOT_R + 2 : DOT_R}
                fill={isHov ? '#3aa3eb' : '#1a2a3a'}
                stroke="#3aa3eb"
                strokeWidth={isHov ? 2.5 : 2}
                style={{ transition: 'r 0.15s, fill 0.15s' }}
              />
              {isHov && (() => {
                const tipW = 110;
                const tipH = 36;
                const tipX = Math.min(Math.max(x - tipW / 2, Y_LABEL_W), width - tipW);
                const tipY = y - tipH - 10;
                return (
                  <g>
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={10}
                      fill="rgba(28,28,30,0.9)" stroke="rgba(58,163,235,0.3)" strokeWidth={1}
                      style={{ backdropFilter: 'blur(20px)' }}
                    />
                    <text x={tipX + tipW / 2} y={tipY + 13}
                      textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={10}>
                      {p.label}
                    </text>
                    <text x={tipX + tipW / 2} y={tipY + 27}
                      textAnchor="middle" fill="#fff" fontSize={12} fontWeight="600">
                      {formatCurrency(p.value)}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}

        {data.map((p, i) => {
          if (!showLabel(i)) return null;
          return (
            <text
              key={i}
              x={xOf(i)}
              y={CHART_H + 18}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize={10}
            >
              {p.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function SnapshotCard({
  icon, iconBg, value, label, pill,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
  pill?: { value: number; positive: boolean };
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="glass-card rounded-2xl p-5 flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-3 h-9">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
        {pill && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            pill.positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {pill.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(pill.value)}%
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </motion.div>
  );
}

function StatTile({
  icon: Icon, label, value, sub, color, onClick,
}: {
  icon: any; label: string; value: string; sub: string;
  color: 'blue' | 'red' | 'neutral' | 'emerald'; onClick?: () => void;
}) {
  const colorMap = {
    blue: 'bg-[#3aa3eb]/15 text-[#3aa3eb]',
    red: 'bg-red-500/15 text-red-400',
    neutral: 'bg-white/5 text-gray-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
  };
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-card rounded-2xl p-4 sm:p-5 text-left"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}><Icon size={18} /></div>
      <p className="text-2xl font-bold text-white tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>
    </motion.button>
  );
}

function QuickActionRow({
  icon: Icon, label, sub, onClick,
}: {
  icon: any; label: string; sub: string; onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left group"
    >
      <div className="w-9 h-9 rounded-xl bg-[#3aa3eb]/15 flex items-center justify-center shrink-0 group-hover:bg-[#3aa3eb]/25 transition-colors">
        <Icon className="text-[#3aa3eb]" size={18} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-white font-medium">{label}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
      <ArrowUpRight className="text-gray-600 group-hover:text-[#3aa3eb] transition-colors" size={16} />
    </motion.button>
  );
}
