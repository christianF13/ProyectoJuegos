import React from 'react';

interface TimerProps {
  remaining: number | null;
  total: number;
  phase: string;
}

function getTimerColor(remaining: number | null, total: number): string {
  if (remaining === null) return 'text-gray-700';
  const ratio = remaining / total;
  if (ratio > 0.5) return 'text-green-400';
  if (ratio > 0.25) return 'text-yellow-400';
  return 'text-red-500';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}`;
}

export default function Timer({ remaining, total, phase }: TimerProps) {
  const color = getTimerColor(remaining, total);
  const isUrgent = remaining !== null && remaining <= 10;

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`timer-display font-black tabular-nums transition-colors duration-1000 ${color} ${
          isUrgent ? 'animate-pulse' : ''
        }`}
      >
        {remaining !== null ? formatTime(remaining) : '--'}
      </div>
      {remaining !== null && (
        <div className="mt-2 w-64 h-1 bg-night-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              color.replace('text-', 'bg-')
            }`}
            style={{ width: `${(remaining / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
