import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={`p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-2xl transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-blue-500/20 hover:border-blue-500/30 ${className}`}
      style={{
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }}
    >
      {children}
    </div>
  );
}
