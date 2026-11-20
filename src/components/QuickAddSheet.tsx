import React, { useEffect, useRef, useState } from 'react';
import { Calendar, CreditCard, Layers, Trash2, X } from 'lucide-react';
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
import {
  addMonthsToISO,
  createId,
  formatILS,
  formatMonthLabel,
  getTodayISO,
} from '../utils/format';

const QUICK_INSTALLMENTS = [1, 2, 3, 6, 12] as const;

type InstallmentAmountMode = 'split_total' | 'per_payment';

function stripInstallmentSuffix(desc: string): string {
  return desc.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
}

export const QuickAddSheet: React.FC = () => {
  const {
    isQuickAddOpen,
    editingTransaction,
    closeQuickAdd,
    activeUser,
    addTransaction,
    addTransactionsBatch,
    replaceWithInstallments,
    updateTransaction,
    deleteTransaction,
    deleteInstallmentGroup,
  } = useBudget();

  const [type, setType] = useState<TransactionType>('הוצאה');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryName>('וולט ואוכל');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('אשראי');
  const [date, setDate] = useState(getTodayISO());
  const [loggedBy, setLoggedBy] = useState<UserName>(activeUser);

  // Installment controls (work in BOTH Add & Edit modes!)
  const [installmentsDraft, setInstallmentsDraft] = useState<string>('1');
  const [currentIndexDraft, setCurrentIndexDraft] = useState<string>('1');
  const [amountMode, setAmountMode] = useState<InstallmentAmountMode>('split_total');

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isQuickAddOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setCategory(editingTransaction.category);
      setDescription(stripInstallmentSuffix(editingTransaction.description));
      setPaymentMethod(editingTransaction.paymentMethod);
      setDate(editingTransaction.date);
      setLoggedBy(editingTransaction.loggedBy);
      setInstallmentsDraft(String(editingTransaction.installmentTotal ?? 1));
      setCurrentIndexDraft(String(editingTransaction.installmentIndex ?? 1));
      // When editing an existing charge (e.g. Sony 244 ₪), default to treating its amount as the monthly payment
      setAmountMode('per_payment');
    } else {
      setType('הוצאה');
      setAmount('');
      setCategory('וולט ואוכל');
      setDescription('');
      setPaymentMethod('אשראי');
      setDate(getTodayISO());
      setLoggedBy(activeUser);
      setInstallmentsDraft('1');
      setCurrentIndexDraft('1');
      setAmountMode('split_total');
      window.setTimeout(() => {
        amountInputRef.current?.focus();
      }, 120);
    }
  }, [isQuickAddOpen, editingTransaction, activeUser]);

  if (!isQuickAddOpen) return null;

  const categories = type === 'הוצאה' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const parsedAmount = parseFloat(amount.replace(/,/g, '.'));
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;

  const parsedTotal = parseInt(installmentsDraft, 10);
  const totalInstallments =
    Number.isFinite(parsedTotal) && parsedTotal >= 1 ? Math.min(36, parsedTotal) : 1;

  const parsedCurrentIdx = parseInt(currentIndexDraft, 10);
  const currentInstallmentIndex = editingTransaction
    ? Math.max(
        1,
        Math.min(
          totalInstallments,
          Number.isFinite(parsedCurrentIdx) ? parsedCurrentIdx : 1
        )
      )
    : 1;

  const remainingPaymentsCount = Math.max(1, totalInstallments - currentInstallmentIndex + 1);
  const showInstallments = type === 'הוצאה';

  // Preview math
  const perPaymentPreview =
    totalInstallments > 1 && validAmount > 0
      ? amountMode === 'per_payment'
        ? validAmount
        : validAmount / remainingPaymentsCount
      : validAmount;

  const lastMonthLabel =
    totalInstallments > 1
      ? formatMonthLabel(addMonthsToISO(date, remainingPaymentsCount - 1).slice(0, 7))
      : '';

  const handleTypeSwitch = (nextType: TransactionType) => {
    setType(nextType);
    if (nextType === 'הכנסה') {
      setInstallmentsDraft('1');
      setCurrentIndexDraft('1');
    }
    const valid = nextType === 'הוצאה' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (!valid.some((c) => c.name === category)) {
      setCategory(valid[0].name);
    }
  };

  const buildInstallmentBatch = (cleanBaseDesc: string) => {
    const groupId = editingTransaction?.installmentGroupId ?? createId('inst');
    const countToCreate = remainingPaymentsCount;

    if (amountMode === 'per_payment') {
      const perAmount = Math.round(validAmount * 100) / 100;
      return Array.from({ length: countToCreate }, (_, offset) => {
        const instNum = currentInstallmentIndex + offset;
        return {
          type,
          amount: perAmount,
          category,
          description: `${cleanBaseDesc} (${instNum}/${totalInstallments})`,
          paymentMethod,
          date: addMonthsToISO(date, offset),
          loggedBy,
          installmentGroupId: groupId,
          installmentIndex: instNum,
          installmentTotal: totalInstallments,
        };
      });
    }

    // Split total amount evenly across countToCreate payments
    const totalCents = Math.round(validAmount * 100);
    const baseCents = Math.floor(totalCents / countToCreate);
    const remainderCents = totalCents - baseCents * countToCreate;

    return Array.from({ length: countToCreate }, (_, offset) => {
      const instNum = currentInstallmentIndex + offset;
      const cents = offset === 0 ? baseCents + remainderCents : baseCents;
      return {
        type,
        amount: Math.round(cents) / 100,
        category,
        description: `${cleanBaseDesc} (${instNum}/${totalInstallments})`,
        paymentMethod,
        date: addMonthsToISO(date, offset),
        loggedBy,
        installmentGroupId: groupId,
        installmentIndex: instNum,
        installmentTotal: totalInstallments,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validAmount <= 0) return;

    const cleanBaseDesc = stripInstallmentSuffix(description.trim()) || category;

    if (editingTransaction) {
      const wasInstallment = Boolean(
        editingTransaction.installmentTotal && editingTransaction.installmentTotal > 1
      );
      const installmentChanged =
        totalInstallments !== (editingTransaction.installmentTotal ?? 1) ||
        currentInstallmentIndex !== (editingTransaction.installmentIndex ?? 1);

      // Converting a single expense to installments OR changing an installment plan
      if (showInstallments && totalInstallments > 1 && (!wasInstallment || installmentChanged)) {
        const batch = buildInstallmentBatch(cleanBaseDesc);
        const futureCount = batch.length - 1;
        replaceWithInstallments(
          editingTransaction.id,
          editingTransaction.installmentGroupId,
          batch,
          futureCount > 0
            ? `הומר לתשלומים: תשלום ${currentInstallmentIndex}/${totalInstallments} + ${futureCount} תשלומים עתידיים (${formatILS(perPaymentPreview)}/חודש)`
            : `עודכן כתשלום ${currentInstallmentIndex}/${totalInstallments}`
        );
        closeQuickAdd();
        return;
      }

      // Downgrading an installment back to a regular single expense
      if (wasInstallment && totalInstallments === 1) {
        updateTransaction({
          id: editingTransaction.id,
          createdAt: editingTransaction.createdAt,
          type,
          amount: Math.round(validAmount * 100) / 100,
          category,
          description: cleanBaseDesc,
          paymentMethod,
          date,
          loggedBy,
        });
        closeQuickAdd();
        return;
      }

      // Standard single-entry edit (keeping existing installment badge if unchanged)
      const finalDesc =
        wasInstallment && totalInstallments > 1
          ? `${cleanBaseDesc} (${currentInstallmentIndex}/${totalInstallments})`
          : cleanBaseDesc;

      updateTransaction({
        ...editingTransaction,
        type,
        amount: Math.round(validAmount * 100) / 100,
        category,
        description: finalDesc,
        paymentMethod,
        date,
        loggedBy,
      });
      closeQuickAdd();
      return;
    }

    // Creating a new transaction
    if (showInstallments && totalInstallments > 1) {
      const batch = buildInstallmentBatch(cleanBaseDesc);
      addTransactionsBatch(
        batch,
        `נפרסו ${totalInstallments} תשלומים של ${formatILS(perPaymentPreview)}`
      );
    } else {
      addTransaction({
        type,
        amount: Math.round(validAmount * 100) / 100,
        category,
        description: cleanBaseDesc,
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

  const handleDeleteAllInstallments = () => {
    if (!editingTransaction?.installmentGroupId) return;
    deleteInstallmentGroup(editingTransaction.installmentGroupId);
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
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#10151F]/95 backdrop-blur-xl pt-2.5 pb-3.5 px-5 border-b border-hairline">
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

          {/* Hero Amount Well */}
          <div className="rounded-3xl fintech-well p-5 text-center">
            <label
              htmlFor="quick-amount"
              className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400 mb-1"
            >
              {showInstallments && totalInstallments > 1
                ? amountMode === 'per_payment'
                  ? 'סכום לכל תשלום חודשי (₪)'
                  : 'סכום כולל של העסקה (₪)'
                : 'סכום בשקלים'}
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
                  ? 'לדוגמה: וולט, סופר, דלק, סוני...'
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

          {/* Credit Card Installments (Both Add & Edit Modes!) */}
          {showInstallments && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  {editingTransaction ? 'הפוך / ערוך כפריסת תשלומים' : 'פריסת תשלומים'}
                </label>
                {totalInstallments > 1 && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {totalInstallments} תשלומים
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {QUICK_INSTALLMENTS.map((n) => {
                  const selected = totalInstallments === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setInstallmentsDraft(String(n));
                        if (currentInstallmentIndex > n) {
                          setCurrentIndexDraft(String(n));
                        }
                      }}
                      className={`pressable flex-1 min-h-[40px] rounded-xl text-xs font-extrabold tabular-nums ${
                        selected
                          ? 'bg-emerald-500 text-white dark:text-slate-950 shadow-xs'
                          : 'fintech-well text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {n === 1 ? 'רגיל' : `×${n}`}
                    </button>
                  );
                })}
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="מספר תשלומים מותאם"
                  value={installmentsDraft}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                    setInstallmentsDraft(digits);
                  }}
                  onBlur={() => {
                    const clamped = Math.max(1, Math.min(36, parseInt(installmentsDraft, 10) || 1));
                    setInstallmentsDraft(String(clamped));
                    if ((parseInt(currentIndexDraft, 10) || 1) > clamped) {
                      setCurrentIndexDraft(String(clamped));
                    }
                  }}
                  dir="ltr"
                  placeholder="1"
                  className="w-14 min-h-[40px] px-2 rounded-xl fintech-well text-center text-xs font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Extra controls when totalInstallments > 1 */}
              {totalInstallments > 1 && (
                <div className="space-y-2.5 pt-0.5">
                  {/* Amount interpretation toggle */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl fintech-well text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setAmountMode('per_payment')}
                      className={`pressable min-h-[34px] px-2 rounded-lg ${
                        amountMode === 'per_payment'
                          ? 'bg-white dark:bg-white/14 text-slate-950 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      סכום לכל תשלום
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountMode('split_total')}
                      className={`pressable min-h-[34px] px-2 rounded-lg ${
                        amountMode === 'split_total'
                          ? 'bg-white dark:bg-white/14 text-slate-950 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      חלק סכום כולל
                    </button>
                  </div>

                  {/* Current installment number when editing (e.g. Sony is already 3/12) */}
                  {editingTransaction && (
                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl fintech-well">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        איזה תשלום זה מתוך {totalInstallments}?
                      </span>
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label="מספר תשלום נוכחי"
                          value={currentIndexDraft}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                            setCurrentIndexDraft(digits);
                          }}
                          onBlur={() => {
                            const clamped = Math.max(
                              1,
                              Math.min(totalInstallments, parseInt(currentIndexDraft, 10) || 1)
                            );
                            setCurrentIndexDraft(String(clamped));
                          }}
                          className="w-12 min-h-[34px] px-2 rounded-lg bg-white dark:bg-white/10 text-center text-xs font-black tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                        <span className="text-xs font-bold text-slate-400 tabular-nums">
                          / {totalInstallments}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Live Preview Banner */}
                  {validAmount > 0 && (
                    <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                      <span>
                        {editingTransaction && remainingPaymentsCount > 1
                          ? `תשלום ${currentInstallmentIndex}/${totalInstallments} + ${remainingPaymentsCount - 1} עתידיים של `
                          : `${remainingPaymentsCount} תשלומים של `}
                        <strong className="font-black">
                          {formatILS(perPaymentPreview)}
                        </strong>
                      </span>
                      <span className="text-[11px] opacity-85">
                        עד {lastMonthLabel}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

          {/* Delete whole installment series shortcut when editing an installment */}
          {editingTransaction?.installmentGroupId && (
            <button
              type="button"
              onClick={handleDeleteAllInstallments}
              className="pressable w-full min-h-[42px] rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[#F43F5E] dark:text-[#FB7185] text-xs font-bold flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              מחק את כל סדרת התשלומים ({editingTransaction.installmentTotal} תשלומים)
            </button>
          )}

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
                ? showInstallments && totalInstallments > 1 &&
                  (totalInstallments !== (editingTransaction.installmentTotal ?? 1) ||
                    currentInstallmentIndex !== (editingTransaction.installmentIndex ?? 1))
                  ? `שמור כ-${totalInstallments} תשלומים`
                  : 'שמור שינויים'
                : showInstallments && totalInstallments > 1
                  ? `פרוס ל-${totalInstallments} תשלומים`
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
