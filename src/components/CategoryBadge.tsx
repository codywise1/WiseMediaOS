import React from 'react';

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{
        backgroundColor: 'rgba(59, 163, 234, 0.33)',
        border: '1px solid rgba(59, 163, 234, 1)',
        color: '#ffffff'
      }}
    >
      {category}
    </span>
  );
}
