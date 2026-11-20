import React, { useMemo, useState } from 'react';
import { ArrowUpLeft, CalendarRange } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useBudget } from '../context/BudgetContext';
import { HEBREW_MONTHS } from '../types/budget';
import { computeAnnualSummary } from '../utils/calculations';
import { formatILS } from '../utils/format';
import { CustomChartTooltip } from './ChartTooltip';

export const AnnualTracker: React.FC = () => {
  const {
    data,
    selectedYear,
    setSelectedYear,
    setSelectedMonth,
    setActiveTab,
    darkMode,
  } = useBudget();

  const [mobileView, setMobileView] = useState<'months' | 'categories'>('months');

  const annual = useMemo(
    () => computeAnnualSummary(data, selectedYear),
    [data, selectedYear]
  );

  const chartData = useMemo(
    () =>
      annual.months.map((m) => ({
        name: m.shortName,
        fullName: `${m.monthName} ${selectedYear}`,
        הכנסות: m.income,
        הוצאות: m.expenses,
        'יתרה נטו': m.net,
      })),
    [annual.months, selectedYear]
  );

  const openMonthDashboard = (monthKey: string) => {
    setSelectedMonth(monthKey);
    setActiveTab('dashboard');
  };

  return (
    <div className="space-y-6">
      {/* Header + Year Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-[26px] font-black tracking-tight">
            מעקב שנתי
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            סיכום 12 חודשים אוטומטי ({annual.activeMonthCount} חודשים פעילים)
          </p>
        </div>

        <div className="inline-flex items-center gap-2 fintech-card px-3.5 py-2 rounded-2xl self-start sm:self-auto">
          <CalendarRange className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-slate-500">שנה:</span>
          <select
            aria-label="בחר שנה למעקב שנתי"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent font-extrabold text-sm text-slate-900 dark:text-white focus:outline-none cursor-pointer tabular-nums"
          >
            {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
              <option key={y} value={y} className="bg-white dark:bg-[#131823]">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Annual KPI Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="fintech-card rounded-[24px] p-4 sm:p-5">
          <div className="text-[11px] font-bold tracking-wide text-slate-400">
            סה&ldquo;כ הכנסות ({selectedYear})
          </div>
          <div className="text-xl sm:text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-1.5">
            {formatILS(annual.totalIncome)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 tabular-nums font-medium">
            ממוצע: {formatILS(annual.avgIncome)} / חודש
          </div>
        </div>

        <div className="fintech-card rounded-[24px] p-4 sm:p-5">
          <div className="text-[11px] font-bold tracking-wide text-slate-400">
            סה&ldquo;כ הוצאות וחיסכון
          </div>
          <div className="text-xl sm:text-2xl font-black tabular-nums text-slate-950 dark:text-white mt-1.5">
            {formatILS(annual.totalExpenses)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 tabular-nums font-medium">
            ממוצע: {formatILS(annual.avgExpenses)} / חודש
          </div>
        </div>

        <div className="fintech-card rounded-[24px] p-4 sm:p-5">
          <div className="text-[11px] font-bold tracking-wide text-slate-400">
            יתרה שנתית פנויה (נטו)
          </div>
          <div
            className={`text-xl sm:text-2xl font-black tabular-nums mt-1.5 ${
              annual.totalNet >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-[#F43F5E] dark:text-[#FB7185]'
            }`}
          >
            {formatILS(annual.totalNet, true)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {annual.totalNet >= 0 ? 'עודף מצטבר' : 'גירעון מצטבר'}
          </div>
        </div>

        <div className="fintech-card rounded-[24px] p-4 sm:p-5">
          <div className="text-[11px] font-bold tracking-wide text-slate-400">
            ממוצע נטו חודשי
          </div>
          <div
            className={`text-xl sm:text-2xl font-black tabular-nums mt-1.5 ${
              annual.avgNet >= 0
                ? 'text-slate-950 dark:text-white'
                : 'text-[#F43F5E] dark:text-[#FB7185]'
            }`}
          >
            {formatILS(annual.avgNet, true)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            מחושב לפי חודשים פעילים
          </div>
        </div>
      </div>

      {/* Annual Composed Chart */}
      <div className="fintech-card rounded-[26px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-extrabold tracking-tight">
              מגמה חודשית — הכנסות, הוצאות ויתרה נטו
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              השוואה חודשית לאורך שנת {selectedYear}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
              הכנסות
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#FB7185]" />
              הוצאות
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-0.5 bg-amber-400" />
              יתרה נטו
            </span>
          </div>
        </div>

        <div className="h-72 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 4"
                vertical={false}
                stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }}
                width={48}
                tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                cursor={{
                  fill: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
                  radius: 8,
                }}
                content={<CustomChartTooltip />}
              />
              <Bar dataKey="הכנסות" fill="#10B981" radius={[6, 6, 2, 2]} maxBarSize={18} />
              <Bar dataKey="הוצאות" fill="#FB7185" radius={[6, 6, 2, 2]} maxBarSize={18} />
              <Line
                type="monotone"
                dataKey="יתרה נטו"
                stroke="#F59E0B"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#F59E0B', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#F59E0B' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mobile & Tablet View Toggle */}
      <div className="lg:hidden space-y-3">
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl fintech-well">
          <button
            type="button"
            onClick={() => setMobileView('months')}
            className={`pressable min-h-[42px] rounded-xl text-xs font-bold ${
              mobileView === 'months'
                ? 'bg-white dark:bg-white/12 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500'
            }`}
          >
            פירוט לפי חודשים (1–12)
          </button>
          <button
            type="button"
            onClick={() => setMobileView('categories')}
            className={`pressable min-h-[42px] rounded-xl text-xs font-bold ${
              mobileView === 'categories'
                ? 'bg-white dark:bg-white/12 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500'
            }`}
          >
            סיכום וממוצע לפי קטגוריה
          </button>
        </div>

        {mobileView === 'months' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {annual.months.map((m) => (
              <button
                key={m.monthKey}
                type="button"
                onClick={() => openMonthDashboard(m.monthKey)}
                className={`pressable text-right rounded-[22px] p-4 flex flex-col gap-2.5 ${
                  m.hasActivity
                    ? 'fintech-card ring-1 ring-emerald-500/20'
                    : 'fintech-card opacity-65'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm">
                    {m.monthName} {selectedYear}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    פתח חודש
                    <ArrowUpLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                  <div>
                    <div className="text-[10px] text-slate-400">הכנסות</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatILS(m.income)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">הוצאות</div>
                    <div className="font-bold">{formatILS(m.expenses)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">נטו</div>
                    <div
                      className={`font-black ${
                        m.net > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : m.net < 0
                            ? 'text-[#F43F5E] dark:text-[#FB7185]'
                            : 'text-slate-400'
                      }`}
                    >
                      {formatILS(m.net, true)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="fintech-card rounded-[26px] divide-y divide-hairline overflow-hidden">
            {[...annual.incomeCategories, ...annual.expenseCategories].map((row) => (
              <div
                key={row.meta.name}
                className="px-4 py-3 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span>{row.meta.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{row.meta.name}</div>
                    <div className="text-[10px] text-slate-400">{row.meta.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 tabular-nums text-left shrink-0">
                  <div>
                    <div className="text-[10px] text-slate-400">סה&ldquo;כ שנתי</div>
                    <div className="text-xs font-extrabold">{formatILS(row.annualTotal)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">ממוצע חודשי</div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatILS(row.monthlyAverage)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Full 12-Month Matrix */}
      <div className="hidden lg:block fintech-card rounded-[26px] overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <h3 className="text-base font-extrabold tracking-tight">
            טבלת מעקב שנתית מלאה ({selectedYear})
          </h3>
          <p className="text-xs text-slate-400">
            לחצו על שם חודש בכותרת למעבר ישיר לסיכום החודשי שלו
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-black/[0.02] dark:bg-white/[0.03] border-b border-hairline font-bold text-slate-500">
                <th className="py-3 px-4 sticky right-0 bg-[#F8F9FA] dark:bg-[#131823] z-10 min-w-[175px]">
                  קטגוריה
                </th>
                {HEBREW_MONTHS.map((m, idx) => (
                  <th key={m} className="py-3 px-2.5 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openMonthDashboard(annual.months[idx].monthKey)}
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {m}
                    </button>
                  </th>
                ))}
                <th className="py-3 px-3 text-center bg-emerald-500/8 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                  סה&ldquo;כ שנתי
                </th>
                <th className="py-3 px-3 text-center bg-black/[0.025] dark:bg-white/[0.04] whitespace-nowrap">
                  ממוצע חודשי
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-hairline tabular-nums">
              {/* Income Rows */}
              {annual.incomeCategories.map((row) => (
                <tr
                  key={row.meta.name}
                  className="hover:bg-black/[0.015] dark:hover:bg-white/[0.025]"
                >
                  <td className="py-2.5 px-4 font-semibold sticky right-0 bg-white dark:bg-[#131823] z-10 whitespace-nowrap">
                    {row.meta.emoji} {row.meta.name}
                  </td>
                  {row.months.map((v, idx) => (
                    <td
                      key={idx}
                      className={`py-2.5 px-2.5 text-center ${
                        v > 0
                          ? 'font-bold text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-300 dark:text-white/15'
                      }`}
                    >
                      {v > 0 ? v.toLocaleString('he-IL') : '—'}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-center font-extrabold bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatILS(row.annualTotal)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold bg-black/[0.015] dark:bg-white/[0.02] whitespace-nowrap">
                    {formatILS(row.monthlyAverage)}
                  </td>
                </tr>
              ))}

              {/* Income Total */}
              <tr className="bg-emerald-500/8 font-extrabold">
                <td className="py-3 px-4 sticky right-0 bg-[#ECFDF5] dark:bg-[#0F241F] text-emerald-800 dark:text-emerald-300 z-10">
                  סה&ldquo;כ הכנסות
                </td>
                {annual.months.map((m) => (
                  <td
                    key={m.monthKey}
                    className="py-3 px-2.5 text-center text-emerald-700 dark:text-emerald-400"
                  >
                    {m.income > 0 ? m.income.toLocaleString('he-IL') : '—'}
                  </td>
                ))}
                <td className="py-3 px-3 text-center text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                  {formatILS(annual.totalIncome)}
                </td>
                <td className="py-3 px-3 text-center text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                  {formatILS(annual.avgIncome)}
                </td>
              </tr>

              {/* Expense Rows */}
              {annual.expenseCategories.map((row) => (
                <tr
                  key={row.meta.name}
                  className="hover:bg-black/[0.015] dark:hover:bg-white/[0.025]"
                >
                  <td className="py-2.5 px-4 font-semibold sticky right-0 bg-white dark:bg-[#131823] z-10 whitespace-nowrap">
                    {row.meta.emoji} {row.meta.name}
                  </td>
                  {row.months.map((v, idx) => (
                    <td
                      key={idx}
                      className={`py-2.5 px-2.5 text-center ${
                        v > 0
                          ? 'font-semibold text-slate-800 dark:text-slate-200'
                          : 'text-slate-300 dark:text-white/15'
                      }`}
                    >
                      {v > 0 ? v.toLocaleString('he-IL') : '—'}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-center font-extrabold bg-emerald-500/5 whitespace-nowrap">
                    {formatILS(row.annualTotal)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold bg-black/[0.015] dark:bg-white/[0.02] whitespace-nowrap">
                    {formatILS(row.monthlyAverage)}
                  </td>
                </tr>
              ))}

              {/* Expense Total */}
              <tr className="bg-black/[0.03] dark:bg-white/[0.04] font-extrabold">
                <td className="py-3 px-4 sticky right-0 bg-[#F1F3F5] dark:bg-[#19202F] z-10">
                  סה&ldquo;כ הוצאות וחיסכון
                </td>
                {annual.months.map((m) => (
                  <td key={m.monthKey} className="py-3 px-2.5 text-center">
                    {m.expenses > 0 ? m.expenses.toLocaleString('he-IL') : '—'}
                  </td>
                ))}
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  {formatILS(annual.totalExpenses)}
                </td>
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  {formatILS(annual.avgExpenses)}
                </td>
              </tr>

              {/* Net Balance Row */}
              <tr className="bg-emerald-500/10 font-black">
                <td className="py-3.5 px-4 sticky right-0 bg-[#E6F8F1] dark:bg-[#102624] text-slate-900 dark:text-white z-10">
                  יתרה חודשית פנויה (נטו)
                </td>
                {annual.months.map((m) => (
                  <td
                    key={m.monthKey}
                    className={`py-3.5 px-2.5 text-center ${
                      m.net > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : m.net < 0
                          ? 'text-[#F43F5E] dark:text-[#FB7185]'
                          : 'text-slate-300 dark:text-white/15'
                    }`}
                  >
                    {m.hasActivity ? m.net.toLocaleString('he-IL') : '—'}
                  </td>
                ))}
                <td
                  className={`py-3.5 px-3 text-center whitespace-nowrap ${
                    annual.totalNet >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[#F43F5E] dark:text-[#FB7185]'
                  }`}
                >
                  {formatILS(annual.totalNet, true)}
                </td>
                <td
                  className={`py-3.5 px-3 text-center whitespace-nowrap ${
                    annual.avgNet >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[#F43F5E] dark:text-[#FB7185]'
                  }`}
                >
                  {formatILS(annual.avgNet, true)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
