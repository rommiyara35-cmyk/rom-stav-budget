import React, { useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import {
  FixedExpenseItem,
  FixedOwner,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../types/budget';
import { formatILS } from '../utils/format';

interface FixedModalProps {
  owner: FixedOwner;
  editing: FixedExpenseItem | null;
  onClose: () => void;
  onSave: (item: Omit<FixedExpenseItem, 'id'>, existingId?: string) => void;
  onDelete?: (id: string) => void;
}

const FixedExpenseModal: React.FC<FixedModalProps> = ({
  owner,
  editing,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(editing?.name ?? '');
  const [planned, setPlanned] = useState(String(editing?.planned ?? ''));
  const [paid, setPaid] = useState(String(editing?.paid ?? ''));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editing?.paymentMethod ?? 'הוראת קבע'
  );
  const [billingDay, setBillingDay] = useState(String(editing?.billingDay ?? 10));
  const [notes, setNotes] = useState(editing?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(
      {
        owner: editing?.owner ?? owner,
        name: name.trim(),
        planned: Math.max(0, Math.round(parseFloat(planned.replace(/,/g, '.')) || 0)),
        paid: Math.max(0, Math.round(parseFloat(paid.replace(/,/g, '.')) || 0)),
        paymentMethod,
        billingDay: Math.max(1, Math.min(31, parseInt(billingDay, 10) || 1)),
        notes: notes.trim(),
      },
      editing?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up w-full sm:max-w-md max-h-[90dvh] overflow-y-auto fintech-sheet rounded-t-[30px] sm:rounded-[30px] border-t sm:border safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-3.5 pb-3.5 border-b border-hairline flex items-center justify-between">
          <h3 className="text-base font-black tracking-tight">
            {editing
              ? 'עריכת הוצאה קבועה'
              : `הוספת הוצאה קבועה — ${owner === 'rom' ? 'רום' : 'סתיו'}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="pressable w-9 h-9 rounded-full fintech-well flex items-center justify-center text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
              שם הסעיף
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: אינטרנט סיבים, חדר כושר..."
              required
              className="w-full min-h-[46px] px-3.5 rounded-2xl fintech-well text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
                מתוכנן (₪)
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={planned}
                onChange={(e) => setPlanned(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="0"
                className="w-full min-h-[46px] px-3.5 rounded-2xl fintech-well text-sm font-bold text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
                שולם בפועל (₪)
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={paid}
                onChange={(e) => setPaid(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="0"
                className="w-full min-h-[46px] px-3.5 rounded-2xl fintech-well text-sm font-bold text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
                אמצעי תשלום
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full min-h-[46px] px-3 rounded-2xl fintech-well text-sm focus:outline-none"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm} className="bg-white dark:bg-[#131823]">
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
                יום חיוב בחודש (1–31)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                dir="ltr"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-2xl fintech-well text-sm font-bold text-center tabular-nums focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
              הערות
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="פירוט נוסף..."
              className="w-full min-h-[46px] px-3.5 rounded-2xl fintech-well text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            {editing && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(editing.id);
                  onClose();
                }}
                aria-label="מחק סעיף"
                className="pressable min-h-[48px] px-4 rounded-2xl bg-rose-500/12 text-[#F43F5E] dark:text-[#FB7185] border border-rose-500/20 flex items-center justify-center"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              className="pressable flex-1 min-h-[48px] rounded-2xl bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 font-extrabold text-sm shadow-lg"
            >
              {editing ? 'שמור שינויים' : 'הוסף סעיף'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface FixedSectionProps {
  title: string;
  owner: FixedOwner;
  accentClass: string;
  items: FixedExpenseItem[];
  onQuickUpdate: (item: FixedExpenseItem) => void;
  onEditModal: (item: FixedExpenseItem) => void;
  onAddModal: (owner: FixedOwner) => void;
  onDelete: (id: string) => void;
}

const FixedSection: React.FC<FixedSectionProps> = ({
  title,
  owner,
  accentClass,
  items,
  onQuickUpdate,
  onEditModal,
  onAddModal,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(true);

  const totals = useMemo(() => {
    const planned = items.reduce((s, i) => s + (Number(i.planned) || 0), 0);
    const paid = items.reduce((s, i) => s + (Number(i.paid) || 0), 0);
    return { planned, paid, diff: planned - paid };
  }, [items]);

  const handleNumberChange = (
    item: FixedExpenseItem,
    field: 'planned' | 'paid',
    raw: string
  ) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const num = cleaned === '' ? 0 : Math.round(parseFloat(cleaned) || 0);
    onQuickUpdate({ ...item, [field]: num });
  };

  return (
    <section className="fintech-card rounded-[26px] overflow-hidden">
      {/* Collapsible Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-black/[0.015] dark:hover:bg-white/[0.025] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-1.5 h-9 rounded-full ${accentClass}`} />
          <div>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {items.length} סעיפים • מסתנכרן אוטומטית לסיכום החודשי
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-3 sm:gap-4 text-left tabular-nums">
            <div>
              <div className="text-[10px] font-semibold tracking-wide text-slate-400">
                מתוכנן
              </div>
              <div className="text-xs sm:text-sm font-bold">{formatILS(totals.planned)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wide text-slate-400">
                שולם בפועל
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatILS(totals.paid)}
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-[10px] font-semibold tracking-wide text-slate-400">
                הפרש
              </div>
              <div
                className={`text-xs sm:text-sm font-bold ${
                  totals.diff < 0
                    ? 'text-[#F43F5E] dark:text-[#FB7185]'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatILS(totals.diff, true)}
              </div>
            </div>
          </div>

          <div className="w-8 h-8 rounded-xl fintech-well flex items-center justify-center text-slate-500">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-hairline">
          {/* Mobile & Tablet Card Layout */}
          <div className="lg:hidden divide-y divide-hairline">
            {items.map((item) => {
              const diff = item.planned - item.paid;
              const isPaidFull = item.planned > 0 && item.paid >= item.planned;
              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{item.paymentMethod}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <CalendarClock className="w-3 h-3" />
                          יום {item.billingDay} בחודש
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.planned > 0 && !isPaidFull && (
                        <button
                          type="button"
                          onClick={() => onQuickUpdate({ ...item, paid: item.planned })}
                          title="סמן כשולם במלואו"
                          className="pressable h-8 px-2.5 rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          שולם
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditModal(item)}
                        aria-label="ערוך סעיף"
                        className="pressable w-8 h-8 rounded-xl fintech-well flex items-center justify-center text-slate-500"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        מתוכנן (₪)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        value={item.planned || ''}
                        placeholder="0"
                        onChange={(e) => handleNumberChange(item, 'planned', e.target.value)}
                        className="w-full min-h-[40px] px-2.5 rounded-xl fintech-well text-sm font-bold text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        שולם (₪)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        value={item.paid || ''}
                        placeholder="0"
                        onChange={(e) => handleNumberChange(item, 'paid', e.target.value)}
                        className="w-full min-h-[40px] px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-sm font-bold text-center tabular-nums text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                    <div className="text-center pt-4">
                      <div className="text-[10px] font-semibold text-slate-400">הפרש</div>
                      <div
                        className={`text-xs font-extrabold tabular-nums ${
                          diff < 0
                            ? 'text-[#F43F5E] dark:text-[#FB7185]'
                            : diff === 0
                              ? 'text-slate-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatILS(diff, true)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Structured Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-black/[0.015] dark:bg-white/[0.02] text-[11px] font-bold tracking-wide text-slate-400 border-b border-hairline">
                  <th className="py-3 px-4">סעיף</th>
                  <th className="py-3 px-3 text-center">מתוכנן (₪)</th>
                  <th className="py-3 px-3 text-center">שולם בפועל (₪)</th>
                  <th className="py-3 px-3 text-center">הפרש</th>
                  <th className="py-3 px-3">אמצעי תשלום</th>
                  <th className="py-3 px-3 text-center">יום חיוב</th>
                  <th className="py-3 px-3">הערות</th>
                  <th className="py-3 px-3 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {items.map((item) => {
                  const diff = item.planned - item.paid;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-black/[0.015] dark:hover:bg-white/[0.025] transition-colors"
                    >
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={item.planned || ''}
                          placeholder="0"
                          onChange={(e) => handleNumberChange(item, 'planned', e.target.value)}
                          className="w-24 py-1.5 px-2 rounded-xl fintech-well text-center font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={item.paid || ''}
                          placeholder="0"
                          onChange={(e) => handleNumberChange(item, 'paid', e.target.value)}
                          className="w-24 py-1.5 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center font-bold tabular-nums text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                      </td>
                      <td
                        className={`py-2.5 px-3 text-center font-bold tabular-nums whitespace-nowrap ${
                          diff < 0
                            ? 'text-[#F43F5E] dark:text-[#FB7185]'
                            : diff === 0
                              ? 'text-slate-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatILS(diff, true)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs font-semibold tabular-nums text-slate-500">
                        {item.billingDay}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                        {item.notes || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {item.planned > 0 && item.paid !== item.planned && (
                            <button
                              type="button"
                              onClick={() => onQuickUpdate({ ...item, paid: item.planned })}
                              title="סמן כשולם"
                              className="pressable p-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/12"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditModal(item)}
                            aria-label="ערוך סעיף"
                            className="pressable p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item.id)}
                            aria-label="מחק סעיף"
                            className="pressable p-1.5 rounded-xl text-slate-400 hover:text-[#FB7185] hover:bg-rose-500/10"
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

          {/* Add New Fixed Item Footer */}
          <div className="px-5 py-3 bg-black/[0.015] dark:bg-white/[0.02] border-t border-hairline flex items-center justify-between">
            <button
              type="button"
              onClick={() => onAddModal(owner)}
              className="pressable inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-xl fintech-well text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/12"
            >
              <Plus className="w-4 h-4" />
              הוסף סעיף קבוע
            </button>

            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
              סה&ldquo;כ שולם:{' '}
              <strong className="text-slate-950 dark:text-white">
                {formatILS(totals.paid)}
              </strong>
            </span>
          </div>
        </div>
      )}
    </section>
  );
};

export const FixedExpenses: React.FC = () => {
  const { data, addFixedExpense, updateFixedExpense, deleteFixedExpense } = useBudget();

  const [modalState, setModalState] = useState<{
    open: boolean;
    owner: FixedOwner;
    editing: FixedExpenseItem | null;
  }>({ open: false, owner: 'rom', editing: null });

  const romItems = useMemo(
    () => data.fixedExpenses.filter((f) => f.owner === 'rom'),
    [data.fixedExpenses]
  );
  const stavItems = useMemo(
    () => data.fixedExpenses.filter((f) => f.owner === 'stav'),
    [data.fixedExpenses]
  );

  const combinedPaid = useMemo(
    () => data.fixedExpenses.reduce((s, f) => s + (Number(f.paid) || 0), 0),
    [data.fixedExpenses]
  );
  const combinedPlanned = useMemo(
    () => data.fixedExpenses.reduce((s, f) => s + (Number(f.planned) || 0), 0),
    [data.fixedExpenses]
  );

  const handleSave = (item: Omit<FixedExpenseItem, 'id'>, existingId?: string) => {
    if (existingId) {
      updateFixedExpense({ ...item, id: existingId });
    } else {
      addFixedExpense(item);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-[26px] font-black tracking-tight">
            הוצאות קבועות
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            כל שינוי מסתנכרן אוטומטית לשורות ההוצאות הקבועות בסיכום החודשי
          </p>
        </div>

        <div className="inline-flex items-center gap-4 px-4 py-2.5 rounded-2xl fintech-card tabular-nums self-start sm:self-auto">
          <div>
            <div className="text-[10px] font-semibold tracking-wide text-slate-400">
              סה&ldquo;כ מתוכנן
            </div>
            <div className="text-sm font-bold">{formatILS(combinedPlanned)}</div>
          </div>
          <div className="w-px h-7 bg-black/[0.08] dark:bg-white/[0.1]" />
          <div>
            <div className="text-[10px] font-semibold tracking-wide text-slate-400">
              סה&ldquo;כ שולם
            </div>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatILS(combinedPaid)}
            </div>
          </div>
        </div>
      </div>

      <FixedSection
        title="הוצאות קבועות — רום"
        owner="rom"
        accentClass="bg-gradient-to-b from-sky-400 to-teal-500"
        items={romItems}
        onQuickUpdate={updateFixedExpense}
        onEditModal={(item) => setModalState({ open: true, owner: 'rom', editing: item })}
        onAddModal={(owner) => setModalState({ open: true, owner, editing: null })}
        onDelete={deleteFixedExpense}
      />

      <FixedSection
        title="הוצאות קבועות — סתיו"
        owner="stav"
        accentClass="bg-gradient-to-b from-amber-400 to-rose-400"
        items={stavItems}
        onQuickUpdate={updateFixedExpense}
        onEditModal={(item) => setModalState({ open: true, owner: 'stav', editing: item })}
        onAddModal={(owner) => setModalState({ open: true, owner, editing: null })}
        onDelete={deleteFixedExpense}
      />

      {modalState.open && (
        <FixedExpenseModal
          owner={modalState.owner}
          editing={modalState.editing}
          onClose={() => setModalState((s) => ({ ...s, open: false }))}
          onSave={handleSave}
          onDelete={deleteFixedExpense}
        />
      )}
    </div>
  );
};
