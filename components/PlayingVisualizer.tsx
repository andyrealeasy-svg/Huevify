import React from 'react';

interface PlayingVisualizerProps {
  isPlaying?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  colorClass?: string;
}

export const PlayingVisualizer: React.FC<PlayingVisualizerProps> = ({
  isPlaying = true,
  size = 'sm',
  className = '',
  colorClass = 'bg-primary'
}) => {
  const heightClass = size === 'xs' ? 'h-3' : size === 'sm' ? 'h-3.5' : size === 'lg' ? 'h-5' : 'h-4';
  const widthClass = size === 'xs' ? 'w-[2px]' : size === 'sm' ? 'w-[2.5px]' : size === 'lg' ? 'w-[3.5px]' : 'w-[3px]';
  const gapClass = size === 'xs' ? 'gap-[1.5px]' : 'gap-[2px]';

  return (
    <div 
      className={`inline-flex items-end justify-center ${heightClass} ${gapClass} ${className} shrink-0 select-none`} 
      title={isPlaying ? "Играет" : "На паузе"}
      aria-hidden="true"
    >
      <span className={`${widthClass} rounded-full ${colorClass} ${isPlaying ? 'animate-eq-1' : 'h-[30%]'}`} />
      <span className={`${widthClass} rounded-full ${colorClass} ${isPlaying ? 'animate-eq-2' : 'h-[75%]'}`} />
      <span className={`${widthClass} rounded-full ${colorClass} ${isPlaying ? 'animate-eq-3' : 'h-[50%]'}`} />
      <span className={`${widthClass} rounded-full ${colorClass} ${isPlaying ? 'animate-eq-4' : 'h-[65%]'}`} />
    </div>
  );
};
