import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Delete',
  cancelText = 'Cancel'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={onClose}></div>
        
        <div className="relative z-10 w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform glass-card neon-glow rounded-2xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-red-900/30">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white title-font">{title}</h3>
          </div>
          
          <p className="text-gray-300 mb-6">{message}</p>
          
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white font-medium transition-colors btn-pill"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}