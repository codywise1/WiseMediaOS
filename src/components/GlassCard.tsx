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
    : 'transition-[transform,box-shadow,border-color] duration-200 ease-out hover:scale-[1.015] hover:border-brand-500/30 hover:shadow-ios-lg';

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl ${hoverClasses} ${className} ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
      style={style}
    >
      {children}
    </div>
  );
}
