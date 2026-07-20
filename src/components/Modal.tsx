import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  sheetOnMobile?: boolean;
  footer?: React.ReactNode;
  hideHeader?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', sheetOnMobile = true, footer, hideHeader = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const useSheet = sheetOnMobile && isMobile;

  const onTouchStart = (e: React.TouchEvent) => {
    if (!useSheet) return;
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!useSheet || startY.current === null || !panelRef.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) panelRef.current.style.transform = `translateY(${delta}px)`;
  };
  const onTouchEnd = () => {
    if (!useSheet || startY.current === null || !panelRef.current) return;
    const delta = panelRef.current.style.transform.match(/translateY\((\d+)px\)/);
    const moved = delta ? parseInt(delta[1], 10) : 0;
    if (moved > 100) {
      onClose();
    }
    panelRef.current.style.transform = '';
    startY.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto ios-scroll">
      <div className="flex items-end md:items-center justify-center min-h-screen">
        <div className="fixed inset-0 ios-modal-backdrop animate-in" onClick={onClose} />

        {useSheet ? (
          <div
            ref={panelRef}
            className="relative w-full ios-sheet-panel z-10 my-0 md:my-8 animate-in ios-sheet-enter"
            style={{ transition: 'transform 0.3s var(--ios-ease)' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="ios-grabber" />
            {!hideHeader && (
              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-white/10">
                <h3 className="text-lg font-bold text-white title-font">{title || ''}</h3>
                <button onClick={onClose} className="ios-close-btn" aria-label="Close">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className={hideHeader ? '' : 'px-5 py-5 custom-scrollbar'} style={hideHeader ? undefined : { maxHeight: '80vh', overflowY: 'auto' }}>
              {children}
            </div>
            {footer && <div className="px-5 py-4 border-t border-white/10">{footer}</div>}
          </div>
        ) : (
          <div
            className={`relative w-full ${maxWidth} ios-modal-panel z-10 my-8 animate-in ios-modal-enter`}
          >
            {!hideHeader && (
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
                <h3 className="text-xl font-bold text-white title-font">{title || ''}</h3>
                <button onClick={onClose} className="ios-close-btn" aria-label="Close">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className={hideHeader ? '' : 'p-6 custom-scrollbar'} style={hideHeader ? undefined : { maxHeight: '80vh', overflowY: 'auto' }}>
              {children}
            </div>
            {footer && <div className="px-6 py-4 border-t border-white/10">{footer}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
