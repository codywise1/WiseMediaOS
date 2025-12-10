import React from 'react';
import { Bell, UserPlus, FileText, MessageSquare, Clock3, X } from 'lucide-react';
import GlassCard from './GlassCard';
import { projectService, invoiceService, appointmentService } from '../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  to?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (to: string) => void;
}

export default function NotificationPanel({ isOpen, onClose, onNavigate }: NotificationPanelProps) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

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
    return date.toLocaleDateString();
  };

  const buildNotificationsFromActivity = (projects: any[], invoices: any[], appointments: any[]): Notification[] => {
    type ActivityItem = {
      id: string;
      type: 'project' | 'invoice' | 'appointment';
      title: string;
      message: string;
      time: string;
      timestamp: number;
      to: string;
    };

    const activities: ActivityItem[] = [];

    projects.forEach((p) => {
      if (!p) return;
      const date = new Date(p.updated_at || p.created_at || Date.now());
      const clientName = p.client?.name || p.client || 'Client';
      const statusLabel = p.status ? String(p.status).replace(/_/g, ' ') : '';

      activities.push({
        id: `project-${p.id}`,
        type: 'project',
        title: p.status === 'completed' ? `Project "${p.name}" completed` : `Project "${p.name}" updated`,
        message: [clientName, statusLabel].filter(Boolean).join(' • '),
        time: formatActivityTime(date),
        timestamp: date.getTime(),
        to: '/projects',
      });
    });

    invoices.forEach((inv) => {
      if (!inv) return;
      const date = new Date(inv.created_at || Date.now());
      const status = inv.status;
      const clientName = inv.client?.name || 'Client';
      const amountText =
        typeof inv.amount === 'number' ? `$${inv.amount.toLocaleString()}` : undefined;
      const statusLabel = status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : '';

      activities.push({
        id: `invoice-${inv.id}`,
        type: 'invoice',
        title: `Invoice for ${clientName} (${status})`,
        message: [amountText, statusLabel].filter(Boolean).join(' • '),
        time: formatActivityTime(date),
        timestamp: date.getTime(),
        to: '/invoices',
      });
    });

    appointments.forEach((appt) => {
      if (!appt) return;
      const dateStr = `${appt.appointment_date}T${appt.appointment_time || '00:00'}`;
      const date = new Date(dateStr);
      const clientName = appt.client?.name || 'Client';
      const typeLabel = appt.type || 'Appointment';

      activities.push({
        id: `appointment-${appt.id}`,
        type: 'appointment',
        title: `Appointment with ${clientName} (${typeLabel})`,
        message: date.toLocaleString(),
        time: formatActivityTime(date),
        timestamp: date.getTime(),
        to: '/appointments',
      });
    });

    activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const top = activities.slice(0, 8);

    return top.map((item, index) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      time: item.time,
      read: index > 2,
      to: item.to,
    }));
  };

  React.useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const [projects, invoices, appointments] = await Promise.all([
          projectService.getAll().catch(() => []),
          invoiceService.getAll().catch(() => []),
          appointmentService.getAll().catch(() => []),
        ]);

        if (cancelled) return;

        const built = buildNotificationsFromActivity(
          projects as any[],
          invoices as any[],
          appointments as any[],
        );
        setNotifications(built);
      } catch (error) {
        console.error('Error loading notifications:', error);
        if (!cancelled) {
          setNotifications([]);
        }
      }
    };

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed top-20 right-4 w-96 max-h-[80vh] z-50 animate-in slide-in-from-top">
        <GlassCard className="overflow-hidden bg-slate-950 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notifications
            </h3>
            <button
              onClick={() => {
                onClose();
                onNavigate?.('/notifications');
              }}
              className="text-xs text-blue-300 hover:text-blue-200 underline decoration-dotted"
            >
              View all
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg transition-colors cursor-pointer ${
                  notification.read
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20'
                }`}
                onClick={() => {
                  if (notification.to) {
                    onNavigate?.(notification.to);
                  }
                  onClose();
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-shrink-0 mt-0.5 text-blue-300">
                    {notification.title.toLowerCase().includes('invoice') ? (
                      <FileText size={16} />
                    ) : notification.title.toLowerCase().includes('client') ? (
                      <UserPlus size={16} />
                    ) : notification.title.toLowerCase().includes('comment') || notification.title.toLowerCase().includes('reply') ? (
                      <MessageSquare size={16} />
                    ) : (
                      <Bell size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      {notification.title}
                    </h4>
                    <p className="text-gray-400 text-sm mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      <Clock3 size={12} />
                      <span>{notification.time}</span>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {notifications.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                No notifications yet
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </>
  );
}
