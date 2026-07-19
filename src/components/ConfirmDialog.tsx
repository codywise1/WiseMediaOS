import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  destructive = true,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen px-4">
      <div className="fixed inset-0 ios-modal-backdrop animate-in" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm ios-modal-panel overflow-hidden animate-in ios-modal-enter">
        <div className="px-6 pt-6 pb-5 text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white title-font mb-1.5">{title}</h3>
          <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
        </div>

        <div className="border-t border-white/10 divide-y divide-white/10">
          <button
            onClick={onConfirm}
            className={`w-full px-6 py-3.5 text-base font-semibold transition-colors ${
              destructive ? 'text-red-400 hover:bg-red-500/10' : 'text-brand-400 hover:bg-brand-500/10'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="w-full px-6 py-3.5 text-base font-semibold text-white hover:bg-white/5 transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
