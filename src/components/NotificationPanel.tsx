import { X } from 'lucide-react';
import GlassCard from './GlassCard';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const notifications: Notification[] = [
    {
      id: '1',
      title: 'Welcome to WiseMediaOS',
      message: 'Complete your profile to get started',
      time: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      title: 'New Course Available',
      message: 'Check out the Marketing Masterclass',
      time: '1 day ago',
      read: true,
    },
    {
      id: '3',
      title: 'System Update',
      message: 'New features have been added',
      time: '2 days ago',
      read: true,
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
        <GlassCard className="overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notifications
            </h3>
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
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      {notification.title}
                    </h4>
                    <p className="text-gray-400 text-sm mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {notification.message}
                    </p>
                    <span className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {notification.time}
                    </span>
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
