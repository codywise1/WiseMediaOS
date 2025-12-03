import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose}></div>

        <div className={`inline-block w-full ${maxWidth} p-6 my-8 overflow-hidden text-left align-middle transition-all transform glass-card neon-glow rounded-2xl`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white title-font">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-700/50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}