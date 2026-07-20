import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  FolderIcon,
  DocumentIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import {
  DollarSign,
  FileText,
  CheckCircle2,
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Sparkles
} from 'lucide-react';

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface DashboardProps {
  currentUser: User | null;
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

function isThisMonth(dateStr: string | Date) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isLastMonth(dateStr: string | Date) {
  const d = new Date(dateStr);
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function Dashboard({ currentUser }: DashboardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [recentActivities, setRecentActivities] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState({
    activeProjects: 0,
    completedProjects: 0,
    totalProjects: 0,
    monthlyRevenue: 0,
    lastMonthRevenue: 0,
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
        type: 'project',
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
        type: 'invoice',
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
        type: 'appointment',
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

          const now = new Date();
          const upcomingAppointments = meetings.filter((m: any) => {
            const d = new Date(m.meeting_date || m.created_at);
            return d >= now;
          }).length;

          const monthlyRevenue = invoices
            .filter((inv: any) => inv.status === 'paid' && isThisMonth(inv.created_at))
            .reduce((sum: number, inv: any) => sum + inv.amount, 0);

          const lastMonthRevenue = invoices
            .filter((inv: any) => inv.status === 'paid' && isLastMonth(inv.created_at))
            .reduce((sum: number, inv: any) => sum + inv.amount, 0);

          const pendingInvoices = invoices
            .filter((inv: any) => inv.status === 'pending')
            .reduce((sum: number, inv: any) => sum + inv.amount, 0);

          const overdueInvoices = invoices
            .filter((inv: any) => inv.status === 'overdue')
            .reduce((sum: number, inv: any) => sum + inv.amount, 0);

          const paidThisMonth = invoices.filter(
            (inv: any) => inv.status === 'paid' && isThisMonth(inv.created_at)
          );

          const dealsSignedThisMonth = projects.filter(
            (p: any) => isThisMonth(p.created_at) && p.status !== 'cancelled'
          ).length;

          const activeProjects = projects.filter(
            (p: any) => p.status === 'in_progress' || p.status === 'in_review'
          ).length;

          const completedProjects = projects.filter((p: any) => p.status === 'completed').length;

          setStats({
            activeProjects,
            completedProjects,
            totalProjects: projects.length,
            monthlyRevenue,
            lastMonthRevenue,
            pendingInvoices,
            overdueInvoices,
            invoicesPaidThisMonth: paidThisMonth.reduce((s: number, i: any) => s + i.amount, 0),
            invoicesPaidThisMonthCount: paidThisMonth.length,
            dealsSignedThisMonth,
            upcomingAppointments,
            activeClients: clients.length,
            totalInvoices: invoices.length,
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

          const pendingInvoices = invoices
            .filter((inv: any) => inv.status === 'pending')
            .reduce((sum: number, inv: any) => sum + inv.amount, 0);

          setStats((s) => ({
            ...s,
            activeProjects: projects.filter((p: any) => p.status === 'in_progress' || p.status === 'in_review').length,
            completedProjects: projects.filter((p: any) => p.status === 'completed').length,
            totalProjects: projects.length,
            pendingInvoices,
            totalInvoices: invoices.length,
            upcomingAppointments: appointments.length,
          }));

          buildRecentActivities(projects as any[], invoices as any[], appointments as any[]);
        }
      } catch (dbError) {
        console.log('Database not available, using empty data:', dbError);
        if (isFirstLoad) {
          setRecentActivities([]);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (isFirstLoad) setRecentActivities([]);
    } finally {
      clearTimeout(safetyTimeout);
      if (isFirstLoad) {
        setLoading(false);
        hasLoadedRef.current = true;
      }
    }
  };

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const revenueChange = calcChange(stats.monthlyRevenue, stats.lastMonthRevenue);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/10 border-t-[#3aa3eb]" />
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500 font-medium mb-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1
          className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
          style={{ fontFamily: 'Integral CF, sans-serif' }}
        >
          {getGreeting()}, Mr. {getLastName(currentUser?.name)}
        </h1>
        <p className="text-gray-400 mt-1.5 text-sm sm:text-base">
          {isAdmin ? "Here's your business at a glance." : "Here's your project overview."}
        </p>
      </div>

      {/* This Month Snapshot — iOS grouped style */}
      {isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">This Month</h2>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs text-[#3aa3eb] hover:text-[#59a1e5] font-medium flex items-center gap-1"
            >
              Details <ArrowRightIcon className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Monthly Revenue */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <DollarSign className="text-emerald-400" size={18} />
                </div>
                {revenueChange !== 0 && (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      revenueChange > 0
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-red-400 bg-red-500/10'
                    }`}
                  >
                    {revenueChange > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {Math.abs(revenueChange)}%
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Revenue collected</p>
            </div>

            {/* Deals Signed */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#3aa3eb]/15 flex items-center justify-center">
                  <Briefcase className="text-[#3aa3eb]" size={18} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {stats.dealsSignedThisMonth}
              </p>
              <p className="text-xs text-gray-500 mt-1">Deals signed</p>
            </div>

            {/* Invoices Paid */}
            <div className="glass-card rounded-2xl p-5 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <CheckCircle2 className="text-violet-400" size={18} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {stats.invoicesPaidThisMonthCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Invoices paid · {formatCurrency(stats.invoicesPaidThisMonth)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Stats — iOS tile grid */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            icon={Briefcase}
            label="Active Projects"
            value={stats.activeProjects.toString()}
            sub={`${stats.completedProjects} completed`}
            color="blue"
            onClick={() => navigate('/projects')}
          />
          <StatTile
            icon={DollarSign}
            label="Outstanding"
            value={formatCurrency(stats.pendingInvoices)}
            sub={stats.overdueInvoices > 0 ? `${formatCurrency(stats.overdueInvoices)} overdue` : 'No overdue'}
            color={stats.overdueInvoices > 0 ? 'red' : 'neutral'}
            onClick={() => navigate('/invoices')}
          />
          <StatTile
            icon={Clock}
            label="Upcoming Calls"
            value={stats.upcomingAppointments.toString()}
            sub="Scheduled"
            color="blue"
            onClick={() => navigate('/meetings')}
          />
          {isAdmin ? (
            <StatTile
              icon={Users}
              label="Active Clients"
              value={stats.activeClients.toString()}
              sub={`${stats.totalProjects} projects total`}
              color="neutral"
              onClick={() => navigate('/clients')}
            />
          ) : (
            <StatTile
              icon={FileText}
              label="Total Invoices"
              value={stats.totalInvoices.toString()}
              sub={`${stats.completedProjects} done`}
              color="neutral"
              onClick={() => navigate('/invoices')}
            />
          )}
        </div>
      </div>

      {/* Quick Actions — iOS list style */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
          <QuickActionRow
            icon={Plus}
            label="New Project"
            sub="Start a new client project"
            onClick={() => navigate('/projects')}
          />
          <QuickActionRow
            icon={FileText}
            label="Create Invoice"
            sub="Bill a client for work completed"
            onClick={() => navigate('/invoices')}
          />
          <QuickActionRow
            icon={CalendarIcon}
            label="Schedule Meeting"
            sub="Book a call with a client"
            onClick={() => navigate('/meetings')}
          />
          {isAdmin && (
            <QuickActionRow
              icon={Sparkles}
              label="New Proposal"
              sub="Draft a proposal for a prospect"
              onClick={() => navigate('/proposals')}
            />
          )}
        </div>
      </div>

      {/* Recent Activity — iOS list style */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Activity</h2>
        </div>
        <div className="glass-card rounded-2xl overflow-hidden">
          {recentActivities.length > 0 ? (
            <div className="divide-y divide-white/5">
              {recentActivities.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => navigate(activity.route)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      activity.status === 'completed' || activity.status === 'success'
                        ? 'bg-emerald-500/15'
                        : activity.status === 'pending'
                        ? 'bg-amber-500/15'
                        : activity.status === 'error'
                        ? 'bg-red-500/15'
                        : 'bg-white/5'
                    }`}
                  >
                    <activity.icon
                      className={
                        activity.status === 'completed' || activity.status === 'success'
                          ? 'text-emerald-400'
                          : activity.status === 'pending'
                          ? 'text-amber-400'
                          : activity.status === 'error'
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }
                      size={17}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{activity.title}</p>
                    {activity.subtitle && (
                      <p className="text-xs text-gray-500 truncate">{activity.subtitle}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 shrink-0">{activity.time}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-500 text-sm">No recent activity yet</p>
              <p className="text-gray-600 text-xs mt-1">Activity will appear as you use the platform</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  color: 'blue' | 'red' | 'neutral' | 'emerald';
  onClick?: () => void;
}) {
  const colorMap = {
    blue: 'bg-[#3aa3eb]/15 text-[#3aa3eb]',
    red: 'bg-red-500/15 text-red-400',
    neutral: 'bg-white/5 text-gray-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
  };

  return (
    <button
      onClick={onClick}
      className="glass-card rounded-2xl p-4 sm:p-5 text-left hover:scale-[1.02] active:scale-[0.99] transition-transform"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>
    </button>
  );
}

function QuickActionRow({
  icon: Icon,
  label,
  sub,
  onClick,
}: {
  icon: any;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
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
    </button>
  );
}
