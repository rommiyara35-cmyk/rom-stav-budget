import React, { useMemo, useState } from 'react';
import {
  ArrowUpLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  Pencil,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useBudget } from '../context/BudgetContext';
import { HEBREW_MONTHS } from '../types/budget';
import { computeMonthPaceForecast, computeMonthlySummary } from '../utils/calculations';
import {
  formatILS,
  formatMonthLabel,
  formatPercent,
  getMonthKey,
  parseMonthKey,
  shiftMonthKey,
} from '../utils/format';
import { CustomChartTooltip } from './ChartTooltip';

interface InlineTargetInputProps {
  value: number;
  onChange: (next: number) => void;
  label: string;
}

const InlineTargetInput: React.FC<InlineTargetInputProps> = ({
  value,
  onChange,
  label,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    setEditing(false);
    const num = parseFloat(draft.replace(/,/g, '.'));
    if (Number.isFinite(num) && num >= 0) {
      onChange(Math.round(num));
    } else {
      setDraft(String(value));
    }
  };

  if (editing) {
    return (
      <input
        type="text"
        inputMode="decimal"
        autoFocus
        aria-label={`עריכת תקציב יעד עבור ${label}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9.,]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        dir="ltr"
        className="w-24 px-2 py-1 rounded-xl bg-emerald-500/12 border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-sm font-bold text-center tabular-nums focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      title="לחצו לעריכת יעד תקציב"
      className="pressable group inline-flex items-center gap-1 px-2 py-1 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 font-semibold text-sm tabular-nums whitespace-nowrap"
    >
      <span>{formatILS(value)}</span>
      <Pencil className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export const MonthlyDashboard: React.FC = () => {
  const {
    data,
    selectedMonth,
    setSelectedMonth,
    updateCategoryTarget,
    jumpToCategoryTransactions,
    darkMode,
  } = useBudget();

  const summary = useMemo(
    () => computeMonthlySummary(data, selectedMonth),
    [data, selectedMonth]
  );

  const pace = useMemo(() => computeMonthPaceForecast(summary), [summary]);

  const { year, monthIndex0 } = parseMonthKey(selectedMonth);

  const donutData = useMemo(
    () =>
      summary.expenseRows
        .filter((r) => r.actual > 0)
        .map((r) => ({
          name: r.meta.name,
          value: r.actual,
          color: r.meta.color,
          emoji: r.meta.emoji,
        }))
        .sort((a, b) => b.value - a.value),
    [summary.expenseRows]
  );

  const barData = useMemo(
    () =>
      summary.expenseRows
        .filter((r) => r.target > 0 || r.actual > 0)
        .map((r) => {
          const isOver = r.target > 0 ? r.ratio > 1 : r.actual > 0;
          const isWarn = !isOver && r.ratio > 0.8;
          return {
            name: r.meta.name.replace('הוצאות קבועות ', 'קבועות '),
            fullName: r.meta.name,
            יעד: r.target,
            בפועל: r.actual,
            barColor: isOver ? '#FB7185' : isWarn ? '#F59E0B' : '#10B981',
          };
        }),
    [summary.expenseRows]
  );

  const isPositiveNet = summary.netBalance >= 0;
  const totalUtilization =
    summary.totalExpenseTarget > 0
      ? summary.totalExpenseActual / summary.totalExpenseTarget
      : 0;
  const savingsRate =
    summary.totalIncomeActual > 0
      ? Math.max(0, summary.netBalance / summary.totalIncomeActual)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header + Tactile Month/Year Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-[26px] font-black tracking-tight">
            סיכום חודשי
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            תמונת מצב ותקציב — {formatMonthLabel(selectedMonth)}
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1 fintech-card p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
            aria-label="חודש קודם"
            className="pressable w-10 h-10 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center justify-center text-slate-600 dark:text-slate-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-2">
            <div className="relative inline-flex items-center">
              <select
                aria-label="בחר חודש"
                value={monthIndex0}
                onChange={(e) => setSelectedMonth(getMonthKey(year, Number(e.target.value)))}
                style={{ WebkitAppearance: 'none', appearance: 'none' }}
                className="appearance-none bg-transparent font-extrabold text-sm text-slate-900 dark:text-white focus:outline-none cursor-pointer py-1.5 pl-4 pr-1"
              >
                {HEBREW_MONTHS.map((m, idx) => (
                  <option key={m} value={idx} className="bg-white dark:bg-[#131823]">
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute left-0" />
            </div>

            <span className="text-slate-300 dark:text-white/15">•</span>

            <div className="relative inline-flex items-center">
              <select
                aria-label="בחר שנה"
                value={year}
                onChange={(e) => setSelectedMonth(getMonthKey(Number(e.target.value), monthIndex0))}
                style={{ WebkitAppearance: 'none', appearance: 'none' }}
                className="appearance-none bg-transparent font-bold text-sm text-slate-500 dark:text-slate-400 focus:outline-none cursor-pointer py-1.5 pl-4 pr-1 tabular-nums"
              >
                {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-[#131823]">
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute left-0" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))}
            aria-label="חודש הבא"
            className="pressable w-10 h-10 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center justify-center text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Apple Wallet / Revolut KPI Bento Deck */}
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-3.5">
        {/* Hero Net Balance Card (Full width on mobile, prominent 5-col on desktop) */}
        <div
          className={`col-span-2 lg:col-span-5 rounded-[28px] p-6 relative overflow-hidden border transition-all ${
            isPositiveNet
              ? 'bg-gradient-to-br from-[#0F2922] via-[#102624] to-[#0D141F] text-white border-emerald-400/20 shadow-[0_18px_40px_-12px_rgba(16,185,129,0.28)]'
              : 'bg-gradient-to-br from-[#2B1219] via-[#221118] to-[#11131C] text-white border-rose-400/25 shadow-[0_18px_40px_-12px_rgba(244,63,94,0.28)]'
          }`}
        >
          {/* Ambient radial specular glow */}
          <div
            className={`pointer-events-none absolute -top-16 -left-16 w-48 h-48 rounded-full blur-3xl opacity-35 ${
              isPositiveNet ? 'bg-emerald-400' : 'bg-[#FB7185]'
            }`}
          />
          <div className="relative z-10 flex flex-col justify-between h-full gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isPositiveNet
                      ? 'bg-emerald-400/18 text-emerald-300'
                      : 'bg-rose-400/18 text-[#FB7185]'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold tracking-wide text-white/75">
                  יתרה חודשית פנויה (נטו)
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  isPositiveNet
                    ? 'bg-emerald-400/16 text-emerald-300 ring-1 ring-emerald-400/25'
                    : 'bg-rose-400/16 text-[#FB7185] ring-1 ring-rose-400/25'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {isPositiveNet ? `${formatPercent(savingsRate)} פנוי` : 'חריגה'}
              </span>
            </div>

            <div>
              <div
                className={`text-4xl sm:text-[42px] font-black tracking-tight leading-none tabular-nums ${
                  isPositiveNet ? 'text-emerald-300' : 'text-[#FB7185]'
                }`}
              >
                {formatILS(summary.netBalance, true)}
              </div>
              <p className="text-xs text-white/60 mt-2">
                {isPositiveNet
                  ? 'מאזן חיובי — ההכנסות מכסות את כל ההוצאות וההשקעות'
                  : 'סך ההוצאות גבוה מההכנסות בחודש זה'}
              </p>
            </div>
          </div>
        </div>

        {/* Income KPI Card */}
        <div className="col-span-1 lg:col-span-3 fintech-card rounded-[26px] p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">
              סה&ldquo;כ הכנסות בפועל
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatILS(summary.totalIncomeActual)}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 tabular-nums font-medium">
              יעד: {formatILS(summary.totalIncomeTarget)}
            </p>
          </div>
        </div>

        {/* Expenses & Savings KPI Card */}
        <div className="col-span-1 lg:col-span-4 fintech-card rounded-[26px] p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">
              סה&ldquo;כ הוצאות וחיסכון
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/12 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-950 dark:text-white">
              {formatILS(summary.totalExpenseActual)}
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="h-1.5 rounded-full bg-slate-200/80 dark:bg-white/[0.07] overflow-hidden">
                <div
                  className={`h-full rounded-full progress-fill animate-bar-origin ${
                    totalUtilization > 1
                      ? 'bg-[#FB7185]'
                      : totalUtilization > 0.8
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.round(totalUtilization * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] tabular-nums">
                <span className="text-slate-400 dark:text-slate-500 font-medium">
                  מתוך {formatILS(summary.totalExpenseTarget)}
                </span>
                <span
                  className={`font-extrabold ${
                    totalUtilization > 1
                      ? 'text-[#F43F5E] dark:text-[#FB7185]'
                      : totalUtilization > 0.8
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatPercent(totalUtilization)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Budget Pace & End-of-Month Forecast Widget */}
      <section className="fintech-card rounded-[24px] p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Gauge className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">
                קצב הוצאות ותחזית סוף חודש
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                {pace.status === 'current'
                  ? `יום ${pace.daysElapsed} מתוך ${pace.daysInMonth} • נותרו ${pace.daysRemaining} ימים (כולל היום)`
                  : pace.status === 'past'
                    ? `חודש שהסתיים (${pace.daysInMonth} ימים)`
                    : `חודש עתידי (${pace.daysInMonth} ימים)`}
              </p>
            </div>
          </div>

          {pace.status === 'current' && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                pace.projectedNetBalance >= 0
                  ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/12 text-[#E11D48] dark:text-[#FB7185]'
              }`}
            >
              <Clock className="w-3 h-3" />
              {pace.isOnTrackBudget
                ? 'בקצב תקציבי מצוין'
                : pace.projectedNetBalance >= 0
                  ? 'מעל יעד התקציב • יתרה חיובית'
                  : 'קצב מוביל לגירעון'}
            </span>
          )}
        </div>

        {/* Time Progress Hairline */}
        {pace.status === 'current' && (
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-slate-200/80 dark:bg-white/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-l from-sky-400 to-emerald-400 progress-fill"
                style={{ width: `${Math.round(pace.timeProgressRatio * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* 3 Forecast Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Daily Budget Allowance */}
          <div className="rounded-2xl fintech-well p-3 space-y-0.5">
            <div className="text-[10px] font-bold tracking-wide text-slate-400">
              {pace.status === 'past' ? 'ממוצע שוטף / יום' : 'מותר ליום (תקציב)'}
            </div>
            <div
              className={`text-sm sm:text-base font-black tabular-nums whitespace-nowrap ${
                pace.status === 'past'
                  ? 'text-slate-900 dark:text-white'
                  : pace.budgetRemaining < 0
                    ? 'text-[#F43F5E] dark:text-[#FB7185]'
                    : pace.dailyBudgetAllowance < 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {pace.status === 'past'
                ? formatILS(pace.dailyVariablePace)
                : pace.budgetRemaining < 0
                  ? formatILS(0)
                  : formatILS(pace.dailyBudgetAllowance)}
            </div>
            <div className="text-[10px] text-slate-400 tabular-nums leading-tight">
              {pace.status === 'past'
                ? `שוטף: ${formatILS(pace.variableSpent)}`
                : pace.budgetRemaining >= 0
                  ? `יתרה: ${formatILS(pace.budgetRemaining)}`
                  : `חריגה: ${formatILS(Math.abs(pace.budgetRemaining))}`}
            </div>
          </div>

          {/* Daily Free Net Allowance */}
          <div className="rounded-2xl fintech-well p-3 space-y-0.5">
            <div className="text-[10px] font-bold tracking-wide text-slate-400">
              {pace.status === 'past' ? 'יתרה יומית נטו' : 'פנוי ליום (נטו)'}
            </div>
            <div
              className={`text-sm sm:text-base font-black tabular-nums whitespace-nowrap ${
                summary.netBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-[#F43F5E] dark:text-[#FB7185]'
              }`}
            >
              {pace.status === 'past'
                ? formatILS(summary.netBalance / pace.daysInMonth, true)
                : formatILS(Math.max(0, pace.dailyFreeNetAllowance))}
            </div>
            <div className="text-[10px] text-slate-400 tabular-nums leading-tight">
              קצב: {formatILS(pace.dailyVariablePace)}/יום
            </div>
          </div>

          {/* Projected End-of-Month Net Balance */}
          <div className="rounded-2xl fintech-well p-3 space-y-0.5">
            <div className="text-[10px] font-bold tracking-wide text-slate-400">
              {pace.status === 'past' ? 'יתרה סופית' : 'תחזית סוף חודש'}
            </div>
            <div
              className={`text-sm sm:text-base font-black tabular-nums whitespace-nowrap ${
                pace.projectedNetBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-[#F43F5E] dark:text-[#FB7185]'
              }`}
            >
              {formatILS(pace.projectedNetBalance, true)}
            </div>
            <div className="text-[10px] text-slate-400 tabular-nums leading-tight">
              צפי: {formatILS(pace.projectedTotalExpenses)}
            </div>
          </div>
        </div>
      </section>

      {/* Income Section */}
      <section className="fintech-card rounded-[26px] overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold tracking-tight">הכנסות</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              לחצו על סכום היעד לעריכה מהירה
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold tabular-nums">
            {formatILS(summary.totalIncomeActual)}
          </span>
        </div>

        <div className="divide-y divide-hairline">
          {summary.incomeRows.map((row) => (
            <div
              key={row.meta.name}
              className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-black/[0.015] dark:hover:bg-white/[0.025] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/12 flex items-center justify-center text-lg shrink-0">
                  {row.meta.emoji}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{row.meta.name}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {row.meta.description}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:flex sm:items-center sm:justify-end gap-2 sm:gap-4 pt-1 sm:pt-0">
                <div className="text-center">
                  <div className="text-[10px] font-semibold tracking-wide text-slate-400">
                    יעד
                  </div>
                  <InlineTargetInput
                    value={row.target}
                    label={row.meta.name}
                    onChange={(val) => updateCategoryTarget(row.meta.name, val)}
                  />
                </div>
                <div className="text-center sm:min-w-[82px]">
                  <div className="text-[10px] font-semibold tracking-wide text-slate-400">
                    בפועל
                  </div>
                  <div className="text-sm font-black tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400 pt-1">
                    {formatILS(row.actual)}
                  </div>
                </div>
                <div className="text-center sm:min-w-[76px]">
                  <div className="text-[10px] font-semibold tracking-wide text-slate-400">
                    הפרש
                  </div>
                  <div
                    className={`text-xs font-bold tabular-nums whitespace-nowrap pt-1.5 ${
                      row.difference >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[#F43F5E] dark:text-[#FB7185]'
                    }`}
                  >
                    {formatILS(row.difference, true)}
                  </div>
                </div>
                <div className="flex items-center justify-end sm:min-w-[46px]">
                  <span className="inline-block px-2 py-1 rounded-lg fintech-well text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">
                    {formatPercent(row.ratio)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Expenses & Savings Section */}
      <section className="fintech-card rounded-[26px] overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold tracking-tight">
              הוצאות, חיסכון והשקעות
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              ירוק תקין • ענבר מעל 80% • אלמוג בחריגה מעל 100%
            </p>
          </div>
          <div className="text-left tabular-nums">
            <div className="text-sm font-black">{formatILS(summary.totalExpenseActual)}</div>
            <div className="text-[11px] text-slate-400 font-medium">
              יתרה: {formatILS(summary.totalExpenseTarget - summary.totalExpenseActual)}
            </div>
          </div>
        </div>

        <div className="divide-y divide-hairline">
          {summary.expenseRows.map((row) => {
            const isOver = row.target > 0 ? row.ratio > 1 : row.actual > 0;
            const isWarn = !isOver && row.ratio > 0.8;
            const barWidth = Math.min(100, Math.round(row.ratio * 100));

            const barColor = isOver
              ? 'bg-gradient-to-l from-[#FB7185] to-[#F43F5E]'
              : isWarn
                ? 'bg-gradient-to-l from-amber-400 to-amber-500'
                : 'bg-gradient-to-l from-emerald-400 to-emerald-500';

            const badgeColor = isOver
              ? 'bg-rose-500/12 text-[#E11D48] dark:text-[#FB7185]'
              : isWarn
                ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';

            return (
              <div
                key={row.meta.name}
                className="px-5 py-4 space-y-2.5 hover:bg-black/[0.015] dark:hover:bg-white/[0.025] transition-colors"
              >
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => jumpToCategoryTransactions(row.meta.name)}
                    className="pressable flex items-center gap-3 min-w-0 text-right group"
                  >
                    <span
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                      style={{ backgroundColor: `${row.meta.color}1A` }}
                    >
                      {row.meta.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {row.meta.name}
                        </span>
                        <ArrowUpLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 shrink-0 transition-colors" />
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[200px] sm:max-w-xs">
                        {row.meta.description}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 sm:gap-5 shrink-0">
                    <div className="text-left sm:text-center">
                      <div className="text-[10px] font-semibold tracking-wide text-slate-400">
                        יעד
                      </div>
                      <InlineTargetInput
                        value={row.target}
                        label={row.meta.name}
                        onChange={(val) => updateCategoryTarget(row.meta.name, val)}
                      />
                    </div>

                    <div className="text-left sm:text-center min-w-[74px]">
                      <div className="text-[10px] font-semibold tracking-wide text-slate-400">
                        בפועל
                      </div>
                      <div className="text-sm font-black tabular-nums">
                        {formatILS(row.actual)}
                      </div>
                    </div>

                    <div className="hidden sm:block text-center min-w-[82px]">
                      <div className="text-[10px] font-semibold tracking-wide text-slate-400">
                        יתרת תקציב
                      </div>
                      <div
                        className={`text-xs font-bold tabular-nums ${
                          row.difference < 0
                            ? 'text-[#F43F5E] dark:text-[#FB7185]'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatILS(row.difference, true)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smooth Animated Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-slate-200/75 dark:bg-white/[0.07] overflow-hidden">
                    <div
                      className={`h-full rounded-full progress-fill animate-bar-origin ${barColor}`}
                      style={{ width: `${row.actual > 0 ? Math.max(4, barWidth) : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`sm:hidden text-[11px] font-bold tabular-nums ${
                        row.difference < 0
                          ? 'text-[#F43F5E] dark:text-[#FB7185]'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {row.difference < 0
                        ? `חריגה ${formatILS(Math.abs(row.difference))}`
                        : `נותר ${formatILS(row.difference)}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold tabular-nums min-w-[46px] text-center ${badgeColor}`}
                    >
                      {row.target > 0
                        ? formatPercent(row.ratio)
                        : row.actual > 0
                          ? 'חריגה'
                          : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut Chart: Expense Breakdown */}
        <div className="fintech-card rounded-[26px] p-5">
          <h3 className="text-base font-extrabold tracking-tight mb-0.5">
            התפלגות הוצאות לפי קטגוריה
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
            פילוח בפועל לחודש {formatMonthLabel(selectedMonth)}
          </p>

          {donutData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              אין עדיין הוצאות בחודש זה
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative w-full sm:w-56 h-56 shrink-0" dir="ltr">
                {/* Center Metric inside Donut */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold tracking-wide text-slate-400">
                    סה&ldquo;כ בפועל
                  </span>
                  <span className="text-lg font-black tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {formatILS(summary.totalExpenseActual)}
                  </span>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={90}
                      paddingAngle={3}
                      cornerRadius={6}
                      stroke="none"
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <CustomChartTooltip
                          mode="donut"
                          totalForPercent={summary.totalExpenseActual}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 w-full space-y-2.5 max-h-60 overflow-y-auto pl-1">
                {donutData.map((item) => {
                  const pct =
                    summary.totalExpenseActual > 0
                      ? Math.round((item.value / summary.totalExpenseActual) * 100)
                      : 0;
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                          {item.emoji} {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span className="font-extrabold">{formatILS(item.value)}</span>
                        <span className="text-slate-400 w-8 text-left font-medium">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bar Chart: Target vs Actual */}
        <div className="fintech-card rounded-[26px] p-5">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="text-base font-extrabold tracking-tight">יעד מול בפועל</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                השוואת תקציב מתוכנן לביצוע בפועל
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-white/20" />
                יעד
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                בפועל
              </span>
            </div>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 4"
                  vertical={false}
                  stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={46}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }}
                  width={46}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                />
                <Tooltip
                  cursor={{
                    fill: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
                    radius: 8,
                  }}
                  content={<CustomChartTooltip />}
                />
                <Bar
                  dataKey="יעד"
                  fill={darkMode ? 'rgba(255,255,255,0.16)' : '#CBD5E1'}
                  radius={[6, 6, 2, 2]}
                  maxBarSize={18}
                />
                <Bar dataKey="בפועל" radius={[6, 6, 2, 2]} maxBarSize={18}>
                  {barData.map((entry) => (
                    <Cell key={entry.fullName} fill={entry.barColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
