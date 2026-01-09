import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  disableHover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function GlassCard({ children, className = '', disableHover = false, onClick, style }: GlassCardProps) {
  const hoverClasses = disableHover
    ? ''
    : 'transition-[transform,shadow,border-color] duration-200 ease-in-out hover:scale-[1.02] hover:shadow-[#59a1e5]/15 hover:border-[#59a1e5]/30';

  return (
    <div
      onClick={onClick}
      className={`p-6 backdrop-blur-xl bg-black/20 border border-white/10 rounded-xl shadow-2xl ${hoverClasses} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        ...style
      }}
    >
      {children}
    </div>
  );
}
