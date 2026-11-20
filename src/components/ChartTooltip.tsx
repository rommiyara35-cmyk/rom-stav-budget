import React from 'react';
import { formatILS } from '../utils/format';

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: {
    fullName?: string;
    name?: string;
    emoji?: string;
    color?: string;
    barColor?: string;
  };
}

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  mode?: 'series' | 'donut';
  totalForPercent?: number;
}

export const CustomChartTooltip: React.FC<CustomChartTooltipProps> = ({
  active,
  payload,
  label,
  mode = 'series',
  totalForPercent,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  if (mode === 'donut') {
    const item = payload[0];
    const num = Number(item.value) || 0;
    const pct =
      totalForPercent && totalForPercent > 0
        ? Math.round((num / totalForPercent) * 100)
        : null;
    const dotColor = item.payload?.color || item.color || '#10B981';

    return (
      <div
        dir="rtl"
        className="rounded-2xl px-3.5 py-2.5 bg-white/95 dark:bg-[#131823]/95 backdrop-blur-xl border border-slate-900/5 dark:border-white/10 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.22)] text-xs min-w-[140px]"
      >
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 mb-1">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <span>
            {item.payload?.emoji ? `${item.payload.emoji} ` : ''}
            {item.name}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 tabular-nums">
          <span className="text-sm font-black text-slate-950 dark:text-white">
            {formatILS(num)}
          </span>
          {pct !== null && (
            <span className="text-[11px] font-semibold text-slate-400">
              {pct}%
            </span>
          )}
        </div>
      </div>
    );
  }

  const title = payload[0]?.payload?.fullName || label;

  return (
    <div
      dir="rtl"
      className="rounded-2xl px-3.5 py-2.5 bg-white/95 dark:bg-[#131823]/95 backdrop-blur-xl border border-slate-900/5 dark:border-white/10 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.24)] text-xs min-w-[155px] space-y-1.5"
    >
      {title && (
        <div className="font-bold text-slate-800 dark:text-slate-100 pb-1 border-b border-slate-900/5 dark:border-white/8">
          {title}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          const indicatorColor =
            entry.name === 'בפועל' && entry.payload?.barColor
              ? entry.payload.barColor
              : entry.color || '#10B981';
          return (
            <div
              key={`${entry.name}-${idx}`}
              className="flex items-center justify-between gap-4 tabular-nums"
            >
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: indicatorColor }}
                />
                {entry.name}
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                {formatILS(Number(entry.value) || 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
