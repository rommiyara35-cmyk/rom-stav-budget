import React, { useRef, useState } from 'react';
import {
  BarChart3,
  Cloud,
  CloudOff,
  Download,
  HardDrive,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Repeat,
  RotateCcw,
  Share2,
  Sun,
  Upload,
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { ActiveTab, USERS } from '../types/budget';

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'סיכום חודשי', shortLabel: 'סיכום', icon: LayoutDashboard },
  { id: 'transactions', label: 'יומן תנועות', shortLabel: 'תנועות', icon: ListOrdered },
  { id: 'fixed', label: 'הוצאות קבועות', shortLabel: 'קבועות', icon: Repeat },
  { id: 'annual', label: 'מעקב שנתי', shortLabel: 'שנתי', icon: BarChart3 },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    session,
    syncState,
    activeUser,
    setActiveUser,
    darkMode,
    toggleDarkMode,
    activeTab,
    setActiveTab,
    openQuickAdd,
    handleImportExcel,
    handleExportExcel,
    copyShareLink,
    leaveHousehold,
    resetToSeedData,
  } = useBudget();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImportExcel(file);
      e.target.value = '';
    }
    setMenuOpen(false);
  };

  const renderSyncBadge = () => {
    if (syncState === 'syncing') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
          <RefreshCw className="w-3 h-3 animate-spin" />
          מסנכרן...
        </span>
      );
    }
    if (syncState === 'synced') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <Cloud className="w-3 h-3" />
          סנכרון חי
        </span>
      );
    }
    if (syncState === 'error') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FB7185]">
          <CloudOff className="w-3 h-3" />
          שגיאת סנכרון
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
        <HardDrive className="w-3 h-3" />
        שמור מקומית
      </span>
    );
  };

  return (
    <div className="min-h-dvh flex app-canvas text-slate-900 dark:text-[#F1F5F9]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Desktop Frosted Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 shrink-0 fintech-glass border-l sticky top-0 h-dvh p-5 justify-between">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 shadow-[0_8px_20px_-4px_rgba(16,185,129,0.45)] flex items-center justify-center text-white text-xl font-black ring-1 ring-white/20">
              ₪
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight leading-tight truncate">
                רום וסתיו
              </h1>
              <div className="flex items-center gap-2 mt-0.5">{renderSyncBadge()}</div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => openQuickAdd(null)}
            className="pressable w-full min-h-[48px] rounded-2xl bg-slate-950 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-extrabold text-sm shadow-lg shadow-slate-950/15 dark:shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            תנועה חדשה
          </button>

          {/* Navigation */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`pressable w-full min-h-[46px] px-3.5 rounded-2xl flex items-center gap-3 text-sm font-bold ${
                    active
                      ? 'bg-white dark:bg-white/10 text-slate-950 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      active ? 'text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Active User Toggle */}
          <div className="pt-4 border-t border-hairline space-y-2">
            <span className="text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500 px-1">
              מתעד פעיל
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl fintech-well">
              {USERS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setActiveUser(u)}
                  className={`pressable min-h-[38px] rounded-xl text-xs font-bold ${
                    activeUser === u
                      ? 'bg-white dark:bg-white/12 text-slate-950 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2.5 pt-4 border-t border-hairline">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="pressable min-h-[40px] px-3 rounded-xl fintech-well hover:bg-slate-200/70 dark:hover:bg-white/10 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
              ייבוא Excel
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="pressable min-h-[40px] px-3 rounded-xl fintech-well hover:bg-slate-200/70 dark:hover:bg-white/10 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              ייצוא Excel
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={copyShareLink}
              title="העתק קישור שיתוף למשק הבית"
              className="pressable flex-1 min-h-[38px] px-3 rounded-xl fintech-well text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              שתף ({session?.householdId})
            </button>
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="מצב כהה/בהיר"
              className="pressable w-9 h-9 rounded-xl fintech-well flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={leaveHousehold}
              title="החלף משק בית"
              aria-label="החלף משק בית"
              className="pressable w-9 h-9 rounded-xl fintech-well flex items-center justify-center text-slate-500 hover:text-[#FB7185]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Mobile Razor-Sharp iOS Header */}
        <header className="lg:hidden sticky top-0 z-30 fintech-header-ios border-b safe-top">
          <div className="px-4 pb-3 pt-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 flex items-center justify-center text-white font-black text-base shadow-[0_6px_16px_-3px_rgba(16,185,129,0.45)] ring-1 ring-white/20 shrink-0">
                ₪
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-black tracking-tight leading-tight truncate">
                  רום וסתיו
                </h1>
                {renderSyncBadge()}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sleek User Segmented Pill */}
              <div className="flex items-center p-0.5 rounded-xl fintech-well">
                {USERS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setActiveUser(u)}
                    className={`pressable px-2.5 py-1.5 rounded-[10px] text-xs font-bold ${
                      activeUser === u
                        ? 'bg-white dark:bg-white/14 text-slate-950 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label="החלף מצב תצוגה"
                className="pressable w-9 h-9 rounded-xl fintech-well flex items-center justify-center text-slate-600 dark:text-slate-300"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="תפריט פעולות"
                  className="pressable w-9 h-9 rounded-xl fintech-well flex items-center justify-center text-slate-600 dark:text-slate-300"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="animate-toast absolute left-0 mt-2 w-60 rounded-2xl fintech-sheet border p-1.5 z-50 space-y-0.5 shadow-2xl">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="pressable w-full min-h-[42px] px-3 rounded-xl text-right text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2.5"
                      >
                        <Upload className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                        ייבוא קובץ Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleExportExcel();
                          setMenuOpen(false);
                        }}
                        className="pressable w-full min-h-[42px] px-3 rounded-xl text-right text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2.5"
                      >
                        <Download className="w-4 h-4 text-emerald-500" />
                        ייצוא לאקסל (4 גיליונות)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          copyShareLink();
                          setMenuOpen(false);
                        }}
                        className="pressable w-full min-h-[42px] px-3 rounded-xl text-right text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2.5"
                      >
                        <Share2 className="w-4 h-4 text-sky-500" />
                        העתק קישור שיתוף
                      </button>
                      <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('לשחזר את נתוני נובמבר 2026 המקוריים מהאקסל?')) {
                            resetToSeedData();
                          }
                          setMenuOpen(false);
                        }}
                        className="pressable w-full min-h-[42px] px-3 rounded-xl text-right text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2.5"
                      >
                        <RotateCcw className="w-4 h-4" />
                        שחזור נתוני בסיס
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          leaveHousehold();
                          setMenuOpen(false);
                        }}
                        className="pressable w-full min-h-[42px] px-3 rounded-xl text-right text-sm font-semibold text-[#F43F5E] dark:text-[#FB7185] hover:bg-rose-500/10 flex items-center gap-2.5"
                      >
                        <LogOut className="w-4 h-4" />
                        החלף משק בית ({session?.householdId})
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Scrollable View */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-nav-safe lg:pb-12">
          {children}
        </main>

        {/* Tactile Floating Action Button (+) */}
        <button
          type="button"
          onClick={() => openQuickAdd(null)}
          aria-label="הוסף תנועה חדשה"
          className="pressable lg:hidden fixed left-5 z-30 w-14 h-14 rounded-full bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-[0_12px_28px_-4px_rgba(0,0,0,0.45)] dark:shadow-[0_12px_28px_-4px_rgba(16,185,129,0.5)] ring-1 ring-white/15 flex items-center justify-center"
          style={{ bottom: 'calc(5.2rem + env(safe-area-inset-bottom))' }}
        >
          <Plus className="w-7 h-7 stroke-[2.6]" />
        </button>

        {/* Sticky iOS Frosted Bottom Tab Bar */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 fintech-glass border-t safe-bottom">
          <div className="grid grid-cols-4 px-2 pt-1.5 pb-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`pressable min-h-[50px] rounded-2xl flex flex-col items-center justify-center gap-1 ${
                    active
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <div
                    className={`px-3.5 py-1 rounded-full transition-colors ${
                      active ? 'bg-emerald-500/12 dark:bg-emerald-400/14' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold leading-none">
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
