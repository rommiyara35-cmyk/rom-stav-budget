import React, { useEffect, useRef, useState } from 'react';
import { Calendar, CreditCard, Trash2, X } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import {
  CategoryName,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  PaymentMethod,
  TransactionType,
  USERS,
  UserName,
} from '../types/budget';
import { getTodayISO } from '../utils/format';

export const QuickAddSheet: React.FC = () => {
  const {
    isQuickAddOpen,
    editingTransaction,
    closeQuickAdd,
    activeUser,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useBudget();

  const [type, setType] = useState<TransactionType>('הוצאה');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryName>('וולט ואוכל');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('אשראי');
  const [date, setDate] = useState(getTodayISO());
  const [loggedBy, setLoggedBy] = useState<UserName>(activeUser);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isQuickAddOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setCategory(editingTransaction.category);
      setDescription(editingTransaction.description);
      setPaymentMethod(editingTransaction.paymentMethod);
      setDate(editingTransaction.date);
      setLoggedBy(editingTransaction.loggedBy);
    } else {
      setType('הוצאה');
      setAmount('');
      setCategory('וולט ואוכל');
      setDescription('');
      setPaymentMethod('אשראי');
      setDate(getTodayISO());
      setLoggedBy(activeUser);
      window.setTimeout(() => {
        amountInputRef.current?.focus();
      }, 120);
    }
  }, [isQuickAddOpen, editingTransaction, activeUser]);

  if (!isQuickAddOpen) return null;

  const categories = type === 'הוצאה' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeSwitch = (nextType: TransactionType) => {
    setType(nextType);
    const valid = nextType === 'הוצאה' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (!valid.some((c) => c.name === category)) {
      setCategory(valid[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount.replace(/,/g, '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    const cleanDesc = description.trim() || category;

    if (editingTransaction) {
      updateTransaction({
        ...editingTransaction,
        type,
        amount: Math.round(numericAmount * 100) / 100,
        category,
        description: cleanDesc,
        paymentMethod,
        date,
        loggedBy,
      });
    } else {
      addTransaction({
        type,
        amount: Math.round(numericAmount * 100) / 100,
        category,
        description: cleanDesc,
        paymentMethod,
        date,
        loggedBy,
      });
    }
    closeQuickAdd();
  };

  const handleDelete = () => {
    if (!editingTransaction) return;
    deleteTransaction(editingTransaction.id);
    closeQuickAdd();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={closeQuickAdd}
    >
      <div
        className="animate-sheet-up w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto fintech-sheet rounded-t-[30px] sm:rounded-[30px] border-t sm:border safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Handle & Header */}
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-[#10151F]/90 backdrop-blur-xl pt-2.5 pb-3.5 px-5 border-b border-hairline">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20 mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {editingTransaction ? 'עריכת תנועה' : 'תיעוד תנועה מהיר'}
            </h2>
            <button
              type="button"
              onClick={closeQuickAdd}
              aria-label="סגור"
              className="pressable w-9 h-9 rounded-full fintech-well flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Type Segmented Control */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl fintech-well">
            <button
              type="button"
              onClick={() => handleTypeSwitch('הוצאה')}
              className={`pressable min-h-[44px] rounded-xl font-extrabold text-sm ${
                type === 'הוצאה'
                  ? 'bg-[#F43F5E] dark:bg-[#FB7185] text-white dark:text-slate-950 shadow-md shadow-rose-500/20'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              הוצאה
            </button>
            <button
              type="button"
              onClick={() => handleTypeSwitch('הכנסה')}
              className={`pressable min-h-[44px] rounded-xl font-extrabold text-sm ${
                type === 'הכנסה'
                  ? 'bg-emerald-500 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              הכנסה
            </button>
          </div>

          {/* Apple Pay / Revolut Hero Amount Well */}
          <div className="rounded-3xl fintech-well p-5 text-center">
            <label
              htmlFor="quick-amount"
              className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400 mb-1"
            >
              סכום בשקלים
            </label>
            <div className="flex items-center justify-center gap-2" dir="ltr">
              <span className="text-2xl font-bold text-slate-400">₪</span>
              <input
                ref={amountInputRef}
                id="quick-amount"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '');
                  setAmount(val);
                }}
                required
                className="w-48 bg-transparent text-center text-5xl font-black tracking-tight tabular-nums text-slate-950 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/15 focus:outline-none"
              />
            </div>
          </div>

          {/* Category Grid */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
              קטגוריה
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const selected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`pressable min-h-[44px] px-3 py-2 rounded-2xl text-right flex items-center gap-2 border text-xs font-bold ${
                      selected
                        ? 'border-emerald-500/60 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'border-transparent fintech-well text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base leading-none">{cat.emoji}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description / Merchant */}
          <div className="space-y-1.5">
            <label
              htmlFor="quick-desc"
              className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400"
            >
              פירוט / בית עסק
            </label>
            <input
              id="quick-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'הוצאה'
                  ? 'לדוגמה: וולט, סופר, דלק, קפה...'
                  : 'לדוגמה: משכורת, החזר ביט...'
              }
              className="w-full min-h-[48px] px-4 rounded-2xl fintech-well text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          {/* Payment Method Pills */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
              <CreditCard className="w-3.5 h-3.5" />
              אמצעי תשלום
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((pm) => {
                const selected = paymentMethod === pm;
                return (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`pressable min-h-[38px] px-3.5 rounded-xl text-xs font-bold ${
                      selected
                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                        : 'fintech-well text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {pm}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Logged By Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="quick-date"
                className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400"
              >
                <Calendar className="w-3.5 h-3.5" />
                תאריך
              </label>
              <input
                id="quick-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full min-h-[46px] px-3 rounded-2xl fintech-well text-slate-900 dark:text-white text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
                תועד ע&ldquo;י
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl fintech-well min-h-[46px]">
                {USERS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setLoggedBy(u)}
                    className={`pressable rounded-xl text-xs font-bold ${
                      loggedBy === u
                        ? 'bg-white dark:bg-white/14 text-slate-950 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit / Delete Actions */}
          <div className="flex items-center gap-2.5 pt-1">
            {editingTransaction && (
              <button
                type="button"
                onClick={handleDelete}
                aria-label="מחק תנועה"
                className="pressable min-h-[52px] px-4 rounded-2xl bg-rose-500/12 text-[#F43F5E] dark:text-[#FB7185] border border-rose-500/20 font-bold flex items-center justify-center"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              className={`pressable flex-1 min-h-[52px] rounded-2xl font-extrabold text-base shadow-lg ${
                type === 'הכנסה'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-emerald-500/25'
                  : 'bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 shadow-slate-950/20'
              }`}
            >
              {editingTransaction
                ? 'שמור שינויים'
                : type === 'הכנסה'
                  ? 'הוסף הכנסה'
                  : 'הוסף הוצאה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
