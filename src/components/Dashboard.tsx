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

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface DashboardProps {
  currentUser: User | null;
}

const adminQuickActions = [
  {
    name: 'Projects',
    description: 'Manage active projects and track progress',
    icon: FolderIcon,
    count: 0,
    status: 'Ready to Start',
    color: 'bg-[#3aa3eb]',
    actions: ['View All', 'Create New'],
    route: '/projects'
  },
  {
    name: 'Invoices',
    description: 'Track payments and outstanding balances',
    icon: DocumentIcon,
    count: 0,
    status: 'No Invoices',
    color: 'bg-[#3aa3eb]',
    actions: ['View All', 'Create New'],
    route: '/invoices'
  },
  {
    name: 'Meetings',
    description: 'Schedule calls and meetings',
    icon: CalendarIcon,
    count: 0,
    status: 'No Meetings',
    color: 'bg-[#3aa3eb]',
    actions: ['View All', 'Schedule New'],
    route: '/meetings'
  },
];

const userQuickActions = [
  {
    name: 'Projects',
    description: 'View your client projects',
    icon: FolderIcon,
    count: 0,
    status: 'No Projects',
    color: 'bg-[#3aa3eb]',
    actions: ['View All'],
    route: '/projects'
  },
  {
    name: 'Invoices',
    description: 'View and pay your client invoices',
    icon: DocumentIcon,
    count: 0,
    status: 'No Invoices',
    color: 'bg-[#3aa3eb]',
    actions: ['View All'],
    route: '/invoices'
  },
];

export default function Dashboard({ currentUser }: DashboardProps) {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = React.useState({
    projects: 0,
    invoices: 0,
    appointments: 0,
    supportTickets: 0,
    pendingInvoices: 0,
    revenue: 0,
    completedProjects: 0,
    overdueInvoices: 0,
    activeClients: 0,
    previousMonthRevenue: 0,
    previousMonthProjects: 0,
    previousMonthInvoices: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [recentActivities, setRecentActivities] = React.useState<any[]>([]);

  const hasLoadedRef = React.useRef(false);

  React.useEffect(() => {
    console.log('[Dashboard] effect triggered, loading dashboard data', { currentUser });
    loadDashboardData();
  }, [currentUser?.id, currentUser?.role]);

  const formatActivityTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
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
        icon: FolderIcon,
        status: p.status === 'completed' ? 'completed' : 'pending',
        title:
          p.status === 'completed'
            ? `Project "${p.name}" completed`
            : `Project "${p.name}" updated`,
        time: formatActivityTime(date),
        timestamp: date.getTime(),
      });
    });

    invoices.forEach((inv) => {
      if (!inv) return;
      const date = new Date(inv.created_at || Date.now());
      const status = inv.status;
      const statusKey =
        status === 'paid' ? 'success' : status === 'pending' ? 'pending' : status === 'overdue' ? 'error' : 'pending';
      activities.push({
        id: `invoice-${inv.id}`,
        type: 'invoice',
        icon: DocumentIcon,
        status: statusKey,
        title: `Invoice for ${inv.client?.name || 'Client'} (${status})`,
        time: formatActivityTime(date),
        timestamp: date.getTime(),
      });
    });

    appointments.forEach((appt) => {
      if (!appt) return;
      const dateStr = `${appt.appointment_date}T${appt.appointment_time || '00:00'}`;
      const date = new Date(dateStr);
      const status = appt.status;
      const statusKey =
        status === 'confirmed' ? 'success' : status === 'pending' ? 'pending' : status === 'cancelled' ? 'error' : 'pending';
      activities.push({
        id: `appointment-${appt.id}`,
        type: 'appointment',
        icon: CalendarIcon,
        status: statusKey,
        title: `Appointment with ${appt.client?.name || 'Client'} (${appt.type})`,
        time: formatActivityTime(date),
        timestamp: date.getTime(),
      });
    });

    activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    setRecentActivities(activities.slice(0, 8));
  };

  const loadDashboardData = async () => {
    const isFirstLoad = !hasLoadedRef.current;
    console.log('[Dashboard] loadDashboardData start', { currentUser, isFirstLoad });
    const safetyTimeout = setTimeout(() => {
      if (isFirstLoad) {
        setLoading(false);
        console.log('[Dashboard] safety timeout fired');
      }
    }, 6000); // safety net for initial load
    try {
      if (isFirstLoad) {
        setLoading(true);
      }

      // Always try to load from Supabase, fallback to empty data if not available
      try {
        if (currentUser?.role === 'admin') {
          // Admin sees all data
          const [projects, invoices, meetings] = await Promise.all([
            projectService.getAll(),
            invoiceService.getAll(),
            meetingService.getAll()
          ]);

          const pendingInvoices = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
          const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);
          const revenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
          const completedProjects = projects.filter(p => p.status === 'completed').length;

          // Calculate previous month data for percentage changes
          const currentDate = new Date();
          const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
          const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

          const previousMonthInvoices = invoices.filter(inv => {
            const invoiceDate = new Date(inv.created_at);
            return invoiceDate >= previousMonth && invoiceDate <= previousMonthEnd && inv.status === 'paid';
          });

          const previousMonthProjects = projects.filter(p => {
            const projectDate = new Date(p.created_at);
            return projectDate >= previousMonth && projectDate <= previousMonthEnd;
          });

          const previousMonthRevenue = previousMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);

          setDashboardData({
            projects: projects.length,
            invoices: invoices.length,
            appointments: meetings.length,
            supportTickets: 0,
            pendingInvoices,
            overdueInvoices,
            revenue,
            completedProjects,
            activeClients: 0,
            previousMonthRevenue,
            previousMonthProjects: previousMonthProjects.length,
            previousMonthInvoices: previousMonthInvoices.length
          });
          buildRecentActivities(projects as any[], invoices as any[], meetings as any[]);
        } else if (currentUser?.id) {
          // Client sees only their data
          // Resolve clients.id by email (schema uses *_tables.client_id -> clients.id)
          // Fallback to auth user id for legacy schemas using profiles.id
          const clientRecord = await clientService.getByEmail(currentUser.email).catch(() => null);
          const effectiveClientId = clientRecord?.id || currentUser.id;
          const [projects, invoices, appointments] = await Promise.all([
            projectService.getByClientId(effectiveClientId),
            invoiceService.getByClientId(effectiveClientId),
            appointmentService.getByClientId(effectiveClientId)
          ]);

          const pendingInvoices = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
          const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);

          setDashboardData({
            projects: projects.length,
            invoices: invoices.length,
            appointments: appointments.length,
            supportTickets: 0,
            pendingInvoices,
            overdueInvoices,
            revenue: 0,
            completedProjects: projects.filter(p => p.status === 'completed').length,
            activeClients: 0,
            previousMonthRevenue: 0,
            previousMonthProjects: 0,
            previousMonthInvoices: 0
          });
          buildRecentActivities(projects as any[], invoices as any[], appointments as any[]);
        }
      } catch (dbError) {
        console.log('Database not available, using empty data:', dbError);
        // Only wipe data if we don't have any data yet (first load)
        if (isFirstLoad) {
          setDashboardData({
            projects: 0,
            invoices: 0,
            appointments: 0,
            supportTickets: 0,
            pendingInvoices: 0,
            overdueInvoices: 0,
            revenue: 0,
            completedProjects: 0,
            activeClients: 0,
            previousMonthRevenue: 0,
            previousMonthProjects: 0,
            previousMonthInvoices: 0
          });
          setRecentActivities([]);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Only wipe data on first load error
      if (isFirstLoad) {
        setDashboardData({
          projects: 0,
          invoices: 0,
          appointments: 0,
          supportTickets: 0,
          pendingInvoices: 0,
          overdueInvoices: 0,
          revenue: 0,
          completedProjects: 0,
          activeClients: 0,
          previousMonthRevenue: 0,
          previousMonthProjects: 0,
          previousMonthInvoices: 0
        });
        setRecentActivities([]);
      }
    } finally {
      clearTimeout(safetyTimeout);
      if (isFirstLoad) {
        setLoading(false);
        hasLoadedRef.current = true;
        console.log('[Dashboard] loadDashboardData finished');
      }
    }
  };

  const quickActions = currentUser?.role === 'admin' ? adminQuickActions : userQuickActions;

  // Update quick actions with real data
  const updatedQuickActions = quickActions.map(action => {
    switch (action.name) {
      case 'Projects':
        return {
          ...action,
          count: dashboardData.projects,
          status: dashboardData.projects > 0 ? `${dashboardData.projects} Active` : 'No Projects'
        };
      case 'Invoices':
        return {
          ...action,
          count: dashboardData.invoices,
          status: dashboardData.pendingInvoices > 0 ? `$${dashboardData.pendingInvoices.toLocaleString()} Pending` : 'No Invoices'
        };
      case 'Appointments':
      case 'Meetings':
        return {
          ...action,
          count: dashboardData.appointments,
          status: dashboardData.appointments > 0 ? `${dashboardData.appointments} Scheduled` : 'No Meetings'
        };
      default:
        return action;
    }
  });

  // Calculate percentage changes
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const projectsChange = calculatePercentageChange(dashboardData.projects, dashboardData.previousMonthProjects);
  const revenueChange = calculatePercentageChange(dashboardData.revenue, dashboardData.previousMonthRevenue);
  const invoicesChange = calculatePercentageChange(dashboardData.invoices, dashboardData.previousMonthInvoices);
  const completionRate = dashboardData.projects > 0 ? Math.round((dashboardData.completedProjects / dashboardData.projects) * 100) : 0;

  // Helper function to get trend icon and color
  const getTrendInfo = (change: number) => {
    if (change > 0) {
      return {
        icon: ArrowTrendingUpIcon,
        color: 'text-green-400 bg-green-900/30',
        prefix: '+'
      };
    } else if (change < 0) {
      return {
        icon: ArrowTrendingDownIcon,
        color: 'text-red-400 bg-red-900/30',
        prefix: ''
      };
    } else {
      return {
        icon: MinusIcon,
        color: 'text-gray-400 bg-gray-900/30',
        prefix: ''
      };
    }
  };

  // Update stats with real data and working percentages
  const updatedStats = currentUser?.role === 'admin' ? [
    {
      name: 'Active Projects',
      value: dashboardData.projects.toString(),
      change: projectsChange,
      subtitle: `${dashboardData.completedProjects} completed`,
      description: 'Total active projects'
    },
    {
      name: 'Monthly Revenue',
      value: `$${dashboardData.revenue.toLocaleString()}`,
      change: revenueChange,
      subtitle: `$${dashboardData.pendingInvoices.toLocaleString()} pending`,
      description: 'Revenue this month'
    },
    {
      name: 'Total Invoices',
      value: dashboardData.invoices.toString(),
      change: invoicesChange,
      subtitle: `$${dashboardData.overdueInvoices.toLocaleString()} overdue`,
      description: 'Invoices generated'
    },
    {
      name: 'Success Rate',
      value: `${completionRate}%`,
      change: completionRate >= 90 ? 5 : completionRate >= 70 ? 0 : -5,
      subtitle: `${dashboardData.completedProjects}/${dashboardData.projects} completed`,
      description: 'Project completion rate'
    },
  ] : [
    {
      name: 'My Projects',
      value: dashboardData.projects.toString(),
      change: 0,
      subtitle: `${dashboardData.completedProjects} completed`,
      description: 'Your assigned projects'
    },
    {
      name: 'Outstanding',
      value: `$${dashboardData.pendingInvoices.toLocaleString()}`,
      change: dashboardData.overdueInvoices > 0 ? -10 : 0,
      subtitle: `${dashboardData.invoices} total invoices`,
      description: 'Pending payments'
    },
  ];

  const handleQuickAction = (actionName: string, route: string) => {
    if (actionName === 'View All') {
      navigate(route);
    } else if (actionName === 'Create New') {
      navigate(route);
    } else if (actionName === 'Book Call') {
      navigate('/appointments');
    } else if (actionName === 'Pay Now') {
      navigate('/invoices');
    } else if (actionName === 'View History') {
      navigate('/invoices');
    } else if (actionName === 'Download PDF') {
      // Simulate PDF download
      const link = document.createElement('a');
      link.href = 'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVGl0bGUgKEludm9pY2UgUmVwb3J0KQovQ3JlYXRvciAoV2lzZSBNZWRpYSBDbGllbnQgUG9ydGFsKQovUHJvZHVjZXIgKFdpc2UgTWVkaWEpCi9DcmVhdGlvbkRhdGUgKEQ6MjAyNDAxMDEwMDAwMDBaKQo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDMgMCBSCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzQgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAzIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCgo1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihJbnZvaWNlIFJlcG9ydCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAxNzQgMDAwMDAgbiAKMDAwMDAwMDIyMSAwMDAwMCBuIAowMDAwMDAwMjc4IDAwMDAwIG4gCjAwMDAwMDAzNzUgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDIgMCBSCj4+CnN0YXJ0eHJlZgo0NjkKJSVFT0Y=';
      link.download = 'invoice-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (actionName === 'Export Report') {
      // Simulate CSV export
      const csvContent = 'Project Name,Client,Status,Progress,Budget\nE-commerce Website,TechStart Inc.,In Progress,85%,$15000\nMobile App,HealthCorp,In Progress,60%,$25000';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'projects-report.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else if (actionName === 'View Calendar' || actionName === 'Schedule New' || actionName === 'View All') {
      navigate('/meetings');
    } else if (actionName === 'Reschedule') {
      navigate('/meetings');
    } else if (actionName === 'Review') {
      navigate('/proposals');
    } else if (actionName === 'Sign Contract') {
      alert('Redirecting to DocuSign for contract signing...');
    } else if (actionName === 'Request Changes') {
      const changes = prompt('What changes would you like to request?');
      if (changes) {
        alert(`Change request submitted:\n\n"${changes}"\n\nOur team will review and respond shortly.`);
      }
    } else if (actionName === 'View Details') {
      // This will be handled by individual components
      console.log(`Viewing details for ${actionName}`);
    } else {
      console.log(`Action: ${actionName}`);
    }
  };

  if (loading) {
    console.log('[Dashboard] rendering local loading spinner', { loading });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
              Welcome back, <span className="gradient-text">{currentUser?.name?.split(' ')[0]}!</span>
            </h1>
            <p className="text-gray-300">Your command center for projects, clients, and activity.</p>
          </div>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => navigate('/projects')}
              className="btn-primary text-white font-medium flex items-center justify-center space-x-2 shrink-glow-button shrink-0 w-full sm:w-auto"
            >
              Start New Project
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${currentUser?.role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6`}>
        {updatedStats.map((stat) => {
          const trendInfo = getTrendInfo(stat.change);
          const TrendIcon = trendInfo.icon;

          return (
            <div key={stat.name} className="glass-card rounded-xl p-6 card-hover neon-glow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-300 font-medium">{stat.subtitle}</p>
                </div>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold ${trendInfo.color}`}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{trendInfo.prefix}{Math.abs(stat.change)}%</span>
                </div>
              </div>

              {/* Progress bar for percentage-based stats */}
              {stat.name.includes('Rate') && (
                <div className="mt-3">
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${parseInt(stat.value) >= 90 ? 'bg-green-500' :
                        parseInt(stat.value) >= 70 ? 'bg-[#3aa3eb]' :
                          'bg-red-500'
                        }`}
                      style={{ width: `${parseInt(stat.value)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {updatedQuickActions.map((action) => (
          <div key={action.name} className="glass-card rounded-xl p-6 card-hover neon-glow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${action.color}`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>{action.count}</span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>{action.name}</h3>
            <p className="text-gray-300 mb-1">{action.description}</p>
            <p className="text-sm text-[#59a1e5] font-semibold mb-4">{action.status}</p>

            <div className="space-y-2">
              {action.actions.map((actionItem, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(actionItem, action.route)}
                  className="w-full btn-pill shrink-glow-button"
                >
                  {actionItem}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="glass-card rounded-xl p-6 neon-glow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>Recent Activity</h2>
          <button
            onClick={() => console.log('View all activities')}
            className="btn-pill shrink-glow-button"
          >
            View All
          </button>
        </div>

        <div className="space-y-4">
          {recentActivities.length > 0 ? recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-800/30 transition-colors cursor-pointer"
              onClick={() => {
                if (activity.type === 'project') navigate('/projects');
                else if (activity.type === 'invoice') navigate('/invoices');
                else if (activity.type === 'appointment') navigate('/meetings');
                else if (activity.type === 'proposal') navigate('/proposals');
              }}
            >
              <div className={`p-2 rounded-lg ${activity.status === 'completed' ? 'bg-green-900/30' :
                activity.status === 'success' ? 'bg-green-900/30' :
                  activity.status === 'pending' ? 'bg-yellow-900/30' :
                    'bg-red-900/30'
                }`}>
                <activity.icon className={`h-5 w-5 text-white ${activity.status === 'completed' ? 'text-green-400' :
                  activity.status === 'success' ? 'text-green-400' :
                    activity.status === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                  }`} />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">{activity.title}</p>
                <p className="text-gray-300 text-sm">{activity.time}</p>
              </div>
            </div>
          )) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-2">No recent activity</p>
              <p className="text-gray-500 text-sm">
                Activity will appear here as you start using the platform
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}