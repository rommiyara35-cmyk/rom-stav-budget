import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp,
  Edit3,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import {
  ALL_CATEGORIES,
  CATEGORY_MAP,
  Transaction,
  TransactionType,
} from '../types/budget';
import { formatILS, formatMonthLabel, formatShortDate } from '../utils/format';

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

interface SwipeableTxCardProps {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

const SwipeableTxCard: React.FC<SwipeableTxCardProps> = ({ tx, onEdit, onDelete }) => {
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);
  const didSwipeRef = useRef(false);

  const meta = CATEGORY_MAP[tx.category];
  const isIncome = tx.type === 'הכנסה';

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
    didSwipeRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    if (!isSwipingRef.current && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
      isSwipingRef.current = true;
      didSwipeRef.current = true;
    }

    if (isSwipingRef.current) {
      const clamped = Math.max(0, Math.min(132, dx));
      setOffsetX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (offsetX > 64) {
      setOffsetX(124);
    } else {
      setOffsetX(0);
    }
    startXRef.current = null;
    startYRef.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-[22px] fintech-well">
      {/* Revealed Swipe Action Buttons */}
      <div className="absolute inset-y-0 left-0 flex items-center gap-1.5 pl-2">
        <button
          type="button"
          onClick={() => {
            setOffsetX(0);
            onDelete(tx.id);
          }}
          aria-label="מחק תנועה"
          className="pressable h-[calc(100%-10px)] w-14 rounded-2xl bg-[#F43F5E] text-white flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold"
        >
          <Trash2 className="w-4 h-4" />
          מחק
        </button>
        <button
          type="button"
          onClick={() => {
            setOffsetX(0);
            onEdit(tx);
          }}
          aria-label="ערוך תנועה"
          className="pressable h-[calc(100%-10px)] w-14 rounded-2xl bg-slate-800 dark:bg-emerald-500 text-white dark:text-slate-950 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold"
        >
          <Edit3 className="w-4 h-4" />
          ערוך
        </button>
      </div>

      {/* Foreground Fintech Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (didSwipeRef.current) {
            didSwipeRef.current = false;
            return;
          }
          if (offsetX > 0) {
            setOffsetX(0);
          } else {
            onEdit(tx);
          }
        }}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition:
            startXRef.current === null
              ? 'transform 0.22s cubic-bezier(0.22,1,0.36,1)'
              : 'none',
        }}
        className="relative fintech-card rounded-[22px] p-3.5 flex items-center justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
            style={{ backgroundColor: `${meta?.color ?? '#10B981'}1C` }}
          >
            {meta?.emoji ?? '💳'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {tx.description}
              </span>
              {tx.installmentTotal && tx.installmentTotal > 1 && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold tabular-nums">
                  {tx.installmentIndex}/{tx.installmentTotal}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {tx.category}
              </span>
              <span>•</span>
              <span className="tabular-nums">{formatShortDate(tx.date)}</span>
              <span>•</span>
              <span>{tx.paymentMethod}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`text-base font-black tabular-nums ${
              isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-950 dark:text-white'
            }`}
          >
            {isIncome ? formatILS(tx.amount, true) : formatILS(-tx.amount)}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              tx.loggedBy === 'רום'
                ? 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
                : 'bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300'
            }`}
          >
            {tx.loggedBy}
          </span>
        </div>
      </div>
    </div>
  );
};

export const TransactionsLog: React.FC = () => {
  const {
    data,
    selectedMonth,
    openQuickAdd,
    deleteTransaction,
    categoryJumpFilter,
    clearCategoryJumpFilter,
  } = useBudget();

  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>(selectedMonth);
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  useEffect(() => {
    setMonthFilter(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    if (categoryJumpFilter) {
      setCategoryFilter(categoryJumpFilter);
      clearCategoryJumpFilter();
    }
  }, [categoryJumpFilter, clearCategoryJumpFilter]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>([selectedMonth]);
    for (const tx of data.transactions) {
      if (tx.date.length >= 7) set.add(tx.date.slice(0, 7));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [data.transactions, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.transactions.filter((tx) => {
      if (monthFilter !== 'all' && !tx.date.startsWith(monthFilter)) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
      if (q) {
        const hay = `${tx.description} ${tx.category} ${tx.paymentMethod} ${tx.loggedBy}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      return a.amount - b.amount;
    });
  }, [data.transactions, monthFilter, typeFilter, categoryFilter, search, sortBy]);

  const filteredStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'הכנסה') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense };
  }, [filteredTransactions]);

  const hasActiveFilters =
    search.trim() !== '' || typeFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-[26px] font-black tracking-tight">
            יומן תנועות
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            החליקו ימינה על כרטיס למחיקה מהירה או לחצו לעריכה
          </p>
        </div>
        <button
          type="button"
          onClick={() => openQuickAdd(null)}
          className="pressable hidden sm:inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-2xl bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 text-sm font-extrabold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          תנועה חדשה
        </button>
      </div>

      {/* Search & Filters Card */}
      <div className="fintech-card rounded-[26px] p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי בית עסק, קטגוריה, אמצעי תשלום או משתמש..."
            className="w-full min-h-[44px] pr-10 pl-9 rounded-2xl fintech-well text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="נקה חיפוש"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            aria-label="סינון לפי חודש"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="min-h-[42px] px-3 rounded-xl fintech-well text-xs font-bold focus:outline-none"
          >
            <option value="all" className="bg-white dark:bg-[#131823]">
              כל החודשים
            </option>
            {availableMonths.map((m) => (
              <option key={m} value={m} className="bg-white dark:bg-[#131823]">
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>

          <select
            aria-label="סינון לפי סוג"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
            className="min-h-[42px] px-3 rounded-xl fintech-well text-xs font-bold focus:outline-none"
          >
            <option value="all" className="bg-white dark:bg-[#131823]">
              הוצאות + הכנסות
            </option>
            <option value="הוצאה" className="bg-white dark:bg-[#131823]">
              הוצאות בלבד
            </option>
            <option value="הכנסה" className="bg-white dark:bg-[#131823]">
              הכנסות בלבד
            </option>
          </select>

          <select
            aria-label="סינון לפי קטגוריה"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-h-[42px] px-3 rounded-xl fintech-well text-xs font-bold focus:outline-none"
          >
            <option value="all" className="bg-white dark:bg-[#131823]">
              כל הקטגוריות
            </option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name} className="bg-white dark:bg-[#131823]">
                {c.emoji} {c.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <ArrowDownUp className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="מיון תנועות"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full min-h-[42px] px-3 pl-8 rounded-xl fintech-well text-xs font-bold focus:outline-none appearance-none"
            >
              <option value="date-desc" className="bg-white dark:bg-[#131823]">
                תאריך: חדש לישן
              </option>
              <option value="date-asc" className="bg-white dark:bg-[#131823]">
                תאריך: ישן לחדש
              </option>
              <option value="amount-desc" className="bg-white dark:bg-[#131823]">
                סכום: גבוה לנמוך
              </option>
              <option value="amount-asc" className="bg-white dark:bg-[#131823]">
                סכום: נמוך לגבוה
              </option>
            </select>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>
              מציג{' '}
              <strong className="text-slate-900 dark:text-white tabular-nums">
                {filteredTransactions.length}
              </strong>{' '}
              תנועות
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('all');
                  setCategoryFilter('all');
                }}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                נקה סינון
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 tabular-nums font-bold">
            {filteredStats.income > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                הכנסות: {formatILS(filteredStats.income)}
              </span>
            )}
            <span className="text-[#F43F5E] dark:text-[#FB7185]">
              הוצאות: {formatILS(filteredStats.expense)}
            </span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredTransactions.length === 0 ? (
        <div className="fintech-card rounded-[26px] p-10 text-center space-y-3">
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            לא נמצאו תנועות התואמות לסינון הנוכחי
          </p>
          <button
            type="button"
            onClick={() => openQuickAdd(null)}
            className="pressable inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 text-xs font-extrabold"
          >
            <Plus className="w-4 h-4" />
            הוסף תנועה ראשונה
          </button>
        </div>
      ) : (
        <>
          {/* Mobile & Tablet Swipeable Cards */}
          <div className="lg:hidden space-y-2.5">
            {filteredTransactions.map((tx) => (
              <SwipeableTxCard
                key={tx.id}
                tx={tx}
                onEdit={(t) => openQuickAdd(t)}
                onDelete={deleteTransaction}
              />
            ))}
          </div>

          {/* Desktop Refined Table */}
          <div className="hidden lg:block fintech-card rounded-[26px] overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-hairline text-[11px] font-bold tracking-wide text-slate-400 bg-black/[0.015] dark:bg-white/[0.02]">
                  <th className="py-3.5 px-4">תאריך</th>
                  <th className="py-3.5 px-4">קטגוריה</th>
                  <th className="py-3.5 px-4">פירוט / בית עסק</th>
                  <th className="py-3.5 px-4">אמצעי תשלום</th>
                  <th className="py-3.5 px-4">תועד ע&ldquo;י</th>
                  <th className="py-3.5 px-4 text-left">סכום</th>
                  <th className="py-3.5 px-4 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredTransactions.map((tx) => {
                  const meta = CATEGORY_MAP[tx.category];
                  const isIncome = tx.type === 'הכנסה';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3 px-4 tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatShortDate(tx.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold fintech-well">
                          <span>{meta?.emoji ?? '💳'}</span>
                          <span>{tx.category}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <span>{tx.description}</span>
                          {tx.installmentTotal && tx.installmentTotal > 1 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold tabular-nums">
                              תשלום {tx.installmentIndex}/{tx.installmentTotal}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.paymentMethod}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            tx.loggedBy === 'רום'
                              ? 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
                              : 'bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300'
                          }`}
                        >
                          {tx.loggedBy}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-left font-black tabular-nums whitespace-nowrap ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-950 dark:text-white'
                        }`}
                      >
                        {isIncome ? formatILS(tx.amount, true) : formatILS(-tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openQuickAdd(tx)}
                            aria-label="ערוך תנועה"
                            className="pressable p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTransaction(tx.id)}
                            aria-label="מחק תנועה"
                            className="pressable p-2 rounded-xl text-slate-400 hover:text-[#FB7185] hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
