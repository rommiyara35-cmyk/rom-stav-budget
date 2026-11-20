import React, { useState } from 'react';
import {
  Cloud,
  HardDrive,
  Home,
  KeyRound,
  Loader2,
  Moon,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { USERS } from '../types/budget';

export const HouseholdGate: React.FC = () => {
  const {
    firebaseReady,
    isConnecting,
    activeUser,
    setActiveUser,
    darkMode,
    toggleDarkMode,
    joinHousehold,
    joinLocalQuickStart,
  } = useBudget();

  const [householdId, setHouseholdId] = useState('rom-stav');
  const [pin, setPin] = useState('2026');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const err = await joinHousehold(householdId, pin);
    if (err) setError(err);
  };

  return (
    <div className="min-h-dvh flex flex-col justify-center items-center px-4 py-10 app-canvas safe-top safe-bottom">
      <button
        type="button"
        onClick={toggleDarkMode}
        aria-label="החלף מצב תצוגה"
        className="pressable fixed top-4 left-4 w-11 h-11 rounded-2xl fintech-card flex items-center justify-center text-slate-600 dark:text-slate-300 safe-top"
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md space-y-6">
        {/* Bespoke Brand Hero */}
        <div className="text-center space-y-3.5">
          <div className="mx-auto w-16 h-16 rounded-[22px] bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 shadow-[0_12px_30px_-4px_rgba(16,185,129,0.45)] flex items-center justify-center text-white text-3xl font-black ring-1 ring-white/20">
            ₪
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              רום וסתיו
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              ניהול תקציב ביתי משותף בזמן אמת
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold fintech-card">
            {firebaseReady ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-400">
                  סנכרון ענן בזמן אמת פעיל
                </span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-slate-600 dark:text-slate-300">
                  מצב מקומי • מוכן לחיבור Firebase
                </span>
              </>
            )}
          </div>
        </div>

        {/* Glass / Elevated Access Card */}
        <form
          onSubmit={handleSubmit}
          className="fintech-card rounded-[28px] p-6 space-y-5"
        >
          {/* Active User Segmented Control */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
              <Users className="w-3.5 h-3.5" />
              מי נכנס עכשיו?
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 fintech-well rounded-2xl">
              {USERS.map((u) => {
                const active = activeUser === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setActiveUser(u)}
                    className={`pressable min-h-[44px] rounded-xl text-sm font-bold ${
                      active
                        ? 'bg-white dark:bg-white/12 text-slate-950 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Household ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="household-id"
              className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400"
            >
              <Home className="w-3.5 h-3.5 text-emerald-500" />
              מזהה משק בית משותף
            </label>
            <input
              id="household-id"
              type="text"
              dir="ltr"
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              placeholder="rom-stav"
              required
              className="w-full min-h-[48px] px-4 rounded-2xl fintech-well text-slate-900 dark:text-white text-left font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
            />
          </div>

          {/* PIN */}
          <div className="space-y-1.5">
            <label
              htmlFor="household-pin"
              className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
              קוד PIN משותף (4 ספרות)
            </label>
            <input
              id="household-pin"
              type="password"
              inputMode="numeric"
              maxLength={8}
              dir="ltr"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="2026"
              required
              className="w-full min-h-[48px] px-4 rounded-2xl fintech-well text-slate-900 dark:text-white text-left tracking-[0.35em] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
            />
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-[#FB7185] text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isConnecting}
            className="pressable w-full min-h-[52px] rounded-2xl bg-slate-950 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-extrabold text-base shadow-lg shadow-slate-950/15 dark:shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                מתחבר...
              </>
            ) : (
              'כניסה לתקציב המשותף'
            )}
          </button>

          {!firebaseReady && (
            <button
              type="button"
              onClick={joinLocalQuickStart}
              className="pressable w-full min-h-[46px] rounded-2xl fintech-well hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-bold flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              כניסה מהירה עם נתוני נובמבר 2026
            </button>
          )}
        </form>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 leading-relaxed px-3">
          טיפ לאייפון: לחצו על שיתוף ב-Safari ובחרו{' '}
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            &ldquo;הוסף למסך הבית&rdquo;
          </span>{' '}
          לחוויית אפליקציה מלאה.
        </p>
      </div>
    </div>
  );
};
