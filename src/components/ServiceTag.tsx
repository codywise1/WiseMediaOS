import React from 'react';

interface ServiceTagProps {
  service: string;
  size?: 'sm' | 'md';
}

const serviceColors: Record<string, string> = {
  'WordPress Website': 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  'SEO': 'bg-red-900/40 text-red-300 border-red-700/50',
  'Brand Identity': 'bg-orange-900/40 text-orange-300 border-orange-700/50',
  'Video Editing': 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  'Graphic Design': 'bg-green-900/40 text-green-300 border-green-700/50',
  'Landing Page': 'bg-pink-900/40 text-pink-300 border-pink-700/50'
};

export default function ServiceTag({ service, size = 'sm' }: ServiceTagProps) {
  const colorClass = serviceColors[service] || 'bg-blue-900/40 text-blue-300 border-blue-700/50';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-md font-medium border ${colorClass} ${sizeClass}`}>
      {service}
    </span>
  );
}
