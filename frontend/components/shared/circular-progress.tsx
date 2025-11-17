'use client';

import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

export function CircularProgress({
  value,
  size = 180,
  strokeWidth = 12,
  className,
  showLabel = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const center = size / 2;

  // Determine color based on value (green/yellow/red based on severity)
  const getColor = (val: number) => {
    if (val >= 75) return { start: '#05e34f', end: '#04c945' }; // Green
    if (val >= 50) return { start: '#eab308', end: '#facc15' }; // Yellow
    if (val >= 30) return { start: '#f97316', end: '#fb923c' }; // Orange
    return { start: '#ef4444', end: '#f87171' }; // Red
  };

  const colors = getColor(value);
  
  // Get text color (green/yellow/red based on severity)
  const getTextColor = (val: number) => {
    if (val >= 75) return '#05e34f';
    if (val >= 50) return '#eab308';
    if (val >= 30) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={`gradient-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id={`glow-${value}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted dark:text-muted"
        />
        
        {/* Progress circle with gradient */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${value})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      
      {/* Label */}
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl font-bold tracking-tight" style={{ color: getTextColor(value) }}>
              {value}%
            </div>
            <div className="text-base text-muted-foreground mt-3 font-bold">
              Ready
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
