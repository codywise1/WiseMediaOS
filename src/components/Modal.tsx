import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

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

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
  sheetOnMobile = true,
  footer,
  hideHeader = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto ios-scroll">
          <div className="flex items-end md:items-center justify-center min-h-screen">
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              }}
            />

            {useSheet ? (
              <motion.div
                ref={panelRef}
                className="relative w-full z-10 my-0 md:my-8"
                style={{
                  transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
                  background: 'rgba(28, 28, 30, 0.9)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderBottom: 'none',
                  borderRadius: '20px 20px 0 0',
                }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-9 h-1 rounded-full bg-white/20" />
                </div>
                {!hideHeader && (
                  <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-white/[0.06]">
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif', letterSpacing: '0.02em' }}>{title || ''}</h3>
                    <button
                      onClick={onClose}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                )}
                <div className={hideHeader ? '' : 'px-5 py-5 custom-scrollbar'} style={hideHeader ? undefined : { maxHeight: '75vh', overflowY: 'auto' }}>
                  {children}
                </div>
                {footer && <div className="px-5 py-4 border-t border-white/[0.06]">{footer}</div>}
              </motion.div>
            ) : (
              <motion.div
                className={`relative w-full ${maxWidth} z-10 my-8`}
                style={{
                  background: 'rgba(28, 28, 30, 0.85)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '24px',
                  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
                }}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              >
                {!hideHeader && (
                  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
                    <h3 className="text-xl font-semibold text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif', letterSpacing: '0.02em' }}>{title || ''}</h3>
                    <button
                      onClick={onClose}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                )}
                <div className={hideHeader ? '' : 'p-6 custom-scrollbar'} style={hideHeader ? undefined : { maxHeight: '75vh', overflowY: 'auto' }}>
                  {children}
                </div>
                {footer && <div className="px-6 py-4 border-t border-white/[0.06]">{footer}</div>}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
