import React from 'react';

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
}

const categoryColors: Record<string, string> = {
  'Personal Care': 'bg-pink-900/40 text-pink-300 border-pink-700/50',
  'Real Estate': 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  'Art': 'bg-red-900/40 text-red-300 border-red-700/50',
  'Web3': 'bg-gray-700/40 text-gray-300 border-gray-600/50',
  'Hospitality': 'bg-orange-900/40 text-orange-300 border-orange-700/50',
  'Travel Agency': 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  'E-Commerce': 'bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-700/50',
  'Law': 'bg-slate-700/40 text-slate-300 border-slate-600/50',
  'Investing': 'bg-orange-800/40 text-orange-200 border-orange-600/50',
  'Finance': 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
  'Forex': 'bg-green-900/40 text-green-300 border-green-700/50'
};

export default function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const colorClass = categoryColors[category] || 'bg-gray-700/40 text-gray-300 border-gray-600/50';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${colorClass} ${sizeClass}`}>
      {category}
    </span>
  );
}
