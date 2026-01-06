import React from 'react';

interface ServiceTagProps {
  service: string;
  size?: 'sm' | 'md';
}

const serviceColors: Record<string, string> = {
  'SEO': 'bg-red-500/20 text-red-400 border-red-500/40',
  'Brand Identity': 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  'Video Editing': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
  'Graphic Design': 'bg-green-500/20 text-green-400 border-green-500/40',
  'Landing Page': 'bg-pink-500/20 text-pink-400 border-pink-500/40'
};

export default function ServiceTag({ service, size = 'md' }: ServiceTagProps) {
  const colorClass = serviceColors[service] || 'bg-blue-500/20 text-blue-400 border-blue-500/40';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${colorClass} ${sizeClass}`}>
      {service}
    </span>
  );
}
