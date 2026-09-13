import React from 'react';

interface ExplicitBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Spotify-style Explicit Content Badge.
 * Always strictly square (aspect-ratio 1:1), shrink-proof (shrink-0),
 * and perfectly centered to prevent stretching or clipping across all views and screen sizes.
 */
export const ExplicitBadge: React.FC<ExplicitBadgeProps> = ({ className = '', size = 'sm' }) => {
  const dimensionClasses = size === 'md'
    ? 'w-4 h-4 min-w-[16px] min-h-[16px] max-w-[16px] max-h-[16px] text-[9px]'
    : 'w-3.5 h-3.5 min-w-[14px] min-h-[14px] max-w-[14px] max-h-[14px] text-[8px]';

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 aspect-square rounded-[2px] border border-secondary/70 bg-surface/90 text-secondary font-bold leading-none select-none tracking-normal ${dimensionClasses} ${className}`}
      title="Explicit"
      aria-label="Explicit"
    >
      E
    </span>
  );
};

export default ExplicitBadge;
