import React from 'react';
import { Bell, UserPlus, FileText, MessageSquare, Clock3, X } from 'lucide-react';
import GlassCard from './GlassCard';
import { projectService, invoiceService, meetingService } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';

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

const NOTIFICATION_READ_STORAGE_KEY = 'wm_notifications_read';

function loadReadNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIFICATION_READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function persistReadNotificationIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      NOTIFICATION_READ_STORAGE_KEY,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // ignore storage errors
  }
}

export default function NotificationPanel({ isOpen, onClose, onNavigate }: NotificationPanelProps) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      const readIds = loadReadNotificationIds();
      readIds.add(id);
      persistReadNotificationIds(readIds);
      return next;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.map((n) => ({ ...n, read: true }));
      const readIds = new Set<string>(next.map((n) => n.id));
      persistReadNotificationIds(readIds);
      return next;
    });
  };

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

  const buildNotificationsFromActivity = (
    projects: any[],
    invoices: any[],
    appointments: any[],
    readIds: Set<string>,
  ): Notification[] => {
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
        title: `Meeting with ${clientName} (${typeLabel})`,
        message: date.toLocaleString(),
        time: formatActivityTime(date),
        timestamp: date.getTime(),
        to: '/meetings',
      });
    });

    activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const top = activities.slice(0, 8);

    return top.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      time: item.time,
      read: readIds.has(item.id),
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
          meetingService.getAll().catch(() => []),
        ]);

        if (cancelled) return;

        const readIds = loadReadNotificationIds();
        const built = buildNotificationsFromActivity(
          projects as any[],
          invoices as any[],
          appointments as any[],
          readIds,
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
      <div className="fixed z-50 animate-in slide-in-from-top left-0 right-0 top-20 px-3 sm:left-auto sm:right-4 sm:px-0 sm:w-96">
        <GlassCard className="overflow-hidden bg-slate-950 border border-white/10">
          <div className="relative flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:pr-10">
            <div className="flex items-center justify-between gap-3 min-w-0">
              {/* <h3 className="text-white font-bold text-lg truncate" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Notifications
              </h3> */}
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white shrink-0 sm:hidden"
                aria-label="Close notifications"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {notifications.some((n) => !n.read) && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-gray-300 hover:text-white underline decoration-dotted"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white hidden sm:inline-flex sm:absolute sm:top-0 sm:right-0"
                aria-label="Close notifications"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-8rem)] sm:max-h-[60vh] custom-scrollbar">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg transition-colors cursor-pointer ${notification.read
                  ? 'bg-white/5 hover:bg-white/10'
                  : 'bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20'
                  }`}
                onClick={() => {
                  if (!notification.read) {
                    markNotificationAsRead(notification.id);
                  }
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
