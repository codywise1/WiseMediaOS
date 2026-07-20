import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="glass-card neon-glow rounded-2xl p-5 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1
            className="font-display font-bold gradient-text leading-tight tracking-tight uppercase truncate"
            style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-gray-300 font-body leading-relaxed text-sm sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
      </div>
    </div>
  );
}
