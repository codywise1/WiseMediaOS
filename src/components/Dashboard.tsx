import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  projectService, 
  invoiceService, 
  appointmentService, 
  proposalService,
  supportService
} from '../lib/supabase';
import { 
  FolderIcon, 
  DocumentIcon, 
  CalendarIcon, 
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface DashboardProps {
  currentUser: User | null;
}

const stats = [
  { name: 'Active Projects', value: '12', change: '+2', changeType: 'increase' },
  { name: 'Pending Invoices', value: '$24,500', change: '+12%', changeType: 'increase' },
  { name: 'This Month Revenue', value: '$89,200', change: '+18%', changeType: 'increase' },
  { name: 'Client Satisfaction', value: '98%', change: '+5%', changeType: 'increase' },
];

const adminQuickActions = [
  {
    name: 'Projects',
    description: 'Manage active projects and track progress',
    icon: FolderIcon,
    count: 0,
    status: 'Ready to Start',
    color: 'bg-[#3aa3eb]',
    actions: ['View All', 'Create New', 'Export Report'],
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
    name: 'Appointments',
    description: 'Schedule calls and meetings',
    icon: CalendarIcon,
    count: 0,
    status: 'No Meetings',
    color: 'bg-[#3aa3eb]',
    actions: ['Book Call', 'View Calendar'],
    route: '/appointments'
  },
  {
    name: 'Proposals',
    description: 'Review and manage project proposals',
    icon: ClipboardDocumentListIcon,
    count: 0,
    status: 'No Proposals',
    color: 'bg-[#3aa3eb]',
    actions: ['Create New', 'View All'],
    route: '/proposals'
  },
  {
    name: 'Support',
    description: 'Get help and submit tickets',
    icon: ChatBubbleLeftRightIcon,
    count: 0,
    status: 'No Tickets',
    color: 'bg-[#3aa3eb]',
    actions: ['Contact Support', 'View Tickets', 'Knowledge Base'],
    route: '/support'
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
  {
    name: 'Support',
    description: 'Get help and submit tickets',
    icon: ChatBubbleLeftRightIcon,
    count: 0,
    status: 'No Tickets',
    color: 'bg-[#3aa3eb]',
    actions: ['Contact Support', 'Create Ticket'],
    route: '/support'
  },
];

const recentActivities: any[] = [];

export default function Dashboard({ currentUser }: DashboardProps) {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = React.useState({
    projects: 0,
    invoices: 0,
    appointments: 0,
    proposals: 0,
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

  React.useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Always try to load from Supabase, fallback to empty data if not available
      try {
        if (currentUser?.role === 'admin') {
          // Admin sees all data
          const [projects, invoices, appointments, proposals, tickets] = await Promise.all([
            projectService.getAll(),
            invoiceService.getAll(),
            appointmentService.getAll(),
            proposalService.getAll(),
            supportService.getAll()
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
            appointments: appointments.length,
            proposals: proposals.length,
            supportTickets: tickets.length,
            pendingInvoices,
            overdueInvoices,
            revenue,
            completedProjects,
            activeClients: 0, // Will be calculated from clients if available
            previousMonthRevenue,
            previousMonthProjects: previousMonthProjects.length,
            previousMonthInvoices: previousMonthInvoices.length
          });
        } else if (currentUser?.id) {
          // Client sees only their data
          const [projects, invoices, appointments, tickets] = await Promise.all([
            projectService.getByClientId(currentUser.id),
            invoiceService.getByClientId(currentUser.id),
            appointmentService.getByClientId(currentUser.id),
            supportService.getByClientId(currentUser.id)
          ]);
          
          const pendingInvoices = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
          const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);
          
          setDashboardData({
            projects: projects.length,
            invoices: invoices.length,
            appointments: appointments.length,
            proposals: 0, // Clients don't see proposals in dashboard
            supportTickets: tickets.length,
            pendingInvoices,
            overdueInvoices,
            revenue: 0, // Clients don't see revenue
            completedProjects: projects.filter(p => p.status === 'completed').length,
            activeClients: 0,
            previousMonthRevenue: 0,
            previousMonthProjects: 0,
            previousMonthInvoices: 0
          });
        }
      } catch (dbError) {
        console.log('Database not available, using empty data:', dbError);
        // Set empty data when database is not available
        setDashboardData({
          projects: 0,
          invoices: 0,
          appointments: 0,
          proposals: 0,
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
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to empty data on any error
      setDashboardData({
        projects: 0,
        invoices: 0,
        appointments: 0,
        proposals: 0,
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
    } finally {
      setLoading(false);
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
        return {
          ...action,
          count: dashboardData.appointments,
          status: dashboardData.appointments > 0 ? `${dashboardData.appointments} Scheduled` : 'No Meetings'
        };
      case 'Proposals':
        return {
          ...action,
          count: dashboardData.proposals,
          status: dashboardData.proposals > 0 ? `${dashboardData.proposals} Active` : 'No Proposals'
        };
      case 'Support':
        return {
          ...action,
          count: dashboardData.supportTickets,
          status: dashboardData.supportTickets > 0 ? `${dashboardData.supportTickets} Open` : 'No Tickets'
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
    } else if (actionName === 'View Calendar') {
      navigate('/appointments');
    } else if (actionName === 'Reschedule') {
      navigate('/appointments');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
              Welcome back, <span className="gradient-text">{currentUser?.name?.split(' ')[0]}!</span>
            </h1>
            <p className="text-gray-300">Here's what's happening with your projects today.</p>
          </div>
          {currentUser?.role === 'admin' && (
            <button 
              onClick={() => navigate('/projects')}
              className="btn-primary text-white font-medium flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              Start New Project
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
                  <p className="text-sm font-medium text-gray-300 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400">{stat.subtitle}</p>
                </div>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${trendInfo.color}`}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{trendInfo.prefix}{Math.abs(stat.change)}%</span>
                </div>
              </div>
              
              {/* Progress bar for percentage-based stats */}
              {stat.name.includes('Rate') && (
                <div className="mt-3">
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        parseInt(stat.value) >= 90 ? 'bg-green-500' :
                        parseInt(stat.value) >= 70 ? 'bg-[#3aa3eb]' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${parseInt(stat.value)}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">{stat.description}</p>
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
              <span className="text-2xl font-bold text-white">{action.count}</span>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>{action.name}</h3>
            <p className="text-gray-400 mb-1">{action.description}</p>
            <p className="text-sm text-blue-400 mb-4">{action.status}</p>
            
            <div className="space-y-2">
              {action.actions.map((actionItem, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(actionItem, action.route)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 btn-pill transition-all duration-200"
                >
                  {actionItem}
                  <ArrowUpRightIcon className="h-4 w-4" />
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
            className="text-blue-400 hover:text-blue-300 text-sm font-medium btn-pill px-4 py-2 hover:bg-blue-900/20"
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
                else if (activity.type === 'appointment') navigate('/appointments');
                else if (activity.type === 'proposal') navigate('/proposals');
              }}
            >
              <div className={`p-2 rounded-lg ${
                activity.status === 'completed' ? 'bg-green-900/30' :
                activity.status === 'success' ? 'bg-green-900/30' :
                activity.status === 'pending' ? 'bg-yellow-900/30' :
                'bg-red-900/30'
              }`}>
                <activity.icon className={`h-5 w-5 text-white ${
                  activity.status === 'completed' ? 'text-green-400' :
                  activity.status === 'success' ? 'text-green-400' :
                  activity.status === 'pending' ? 'text-yellow-400' :
                  'text-red-400'
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{activity.title}</p>
                <p className="text-gray-400 text-sm">{activity.time}</p>
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