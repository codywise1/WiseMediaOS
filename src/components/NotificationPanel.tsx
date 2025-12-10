import { Bell, UserPlus, FileText, MessageSquare, Clock3, X } from 'lucide-react';
import GlassCard from './GlassCard';

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
  const notifications: Notification[] = [
    {
      id: '1',
      title: 'New client created',
      message: 'Acme Corp has been added to the CRM',
      time: '5m ago',
      read: false,
      to: '/clients'
    },
    {
      id: '2',
      title: 'Invoice paid',
      message: 'INV-2041 paid • $4,800 received',
      time: '1h ago',
      read: true,
      to: '/invoices'
    },
    {
      id: '3',
      title: 'Community reply',
      message: 'New comment on your post in #design',
      time: '2h ago',
      read: true,
      to: '/community'
    },
    {
      id: '4',
      title: 'Course enrollment',
      message: 'Creator Funnels 101 • 1 new student',
      time: '1d ago',
      read: true,
      to: '/community/courses'
    },
  ];

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
