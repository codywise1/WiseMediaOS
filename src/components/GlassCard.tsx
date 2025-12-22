import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  disableHover?: boolean;
}

export default function GlassCard({ children, className = '', disableHover = false }: GlassCardProps) {
  const hoverClasses = disableHover
    ? ''
    : 'transition-[transform,shadow,border-color] duration-200 ease-in-out hover:scale-[1.02] hover:shadow-[#59a1e5]/15 hover:border-[#59a1e5]/30';

  return (
    <div
      className={`p-6 backdrop-blur-xl bg-black/20 border border-white/10 rounded-xl shadow-2xl ${hoverClasses} ${className}`}
      style={{
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }}
    >
      {children}
    </div>
  );
}
