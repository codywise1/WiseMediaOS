import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

const variantStyles = {
  primary: 'bg-[#3aa3eb]/20 text-[#3aa3eb] border-[#3aa3eb]/30',
  secondary: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  neutral: 'bg-slate-700/50 text-gray-300 border-slate-600/50',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export default function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  icon: Icon,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-lg border font-medium whitespace-nowrap
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {Icon && <Icon className="h-3 w-3 flex-shrink-0" />}
      {children}
    </span>
  );
}
