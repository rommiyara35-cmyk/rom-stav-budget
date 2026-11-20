import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createSeedBudgetData } from '../data/seedData';
import { isFirebaseConfigured } from '../services/firebase';
import {
  connectHousehold,
  readCachedHouseholdData,
  sanitizeHouseholdId,
  saveHouseholdData,
  subscribeToHousehold,
} from '../services/syncService';
import {
  ActiveTab,
  BudgetData,
  FixedExpenseItem,
  HouseholdSession,
  ToastMessage,
  Transaction,
  UserName,
} from '../types/budget';
import { exportBudgetToExcel, importBudgetFromExcel } from '../utils/excel';
import { createId, getTodayISO } from '../utils/format';

const SESSION_KEY = 'rom_stav_session_v1';
const USER_KEY = 'rom_stav_active_user_v1';
const THEME_KEY = 'rom_stav_theme_v1';

interface BudgetContextValue {
  session: HouseholdSession | null;
  isConnecting: boolean;
  syncState: 'synced' | 'syncing' | 'local' | 'error';
  firebaseReady: boolean;

  activeUser: UserName;
  setActiveUser: (user: UserName) => void;

  darkMode: boolean;
  toggleDarkMode: () => void;

  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  selectedMonth: string; // YYYY-MM, default '2026-11'
  setSelectedMonth: (monthKey: string) => void;

  selectedYear: number;
  setSelectedYear: (year: number) => void;

  // Quick-add / edit modal state
  isQuickAddOpen: boolean;
  editingTransaction: Transaction | null;
  openQuickAdd: (tx?: Transaction | null) => void;
  closeQuickAdd: () => void;

  // Optional category filter jump from dashboard -> transactions
  categoryJumpFilter: string | null;
  jumpToCategoryTransactions: (category: string) => void;
  clearCategoryJumpFilter: () => void;

  data: BudgetData;
  toasts: ToastMessage[];
  notify: (text: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;

  // Session actions
  joinHousehold: (householdId: string, pin: string) => Promise<string | null>;
  joinLocalQuickStart: () => Promise<void>;
  leaveHousehold: () => void;
  copyShareLink: () => Promise<void>;

  // Data mutations
  updateCategoryTarget: (category: string, target: number) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  addTransactionsBatch: (txs: Array<Omit<Transaction, 'id' | 'createdAt'>>, toastText?: string) => void;
  replaceWithInstallments: (
    originalId: string,
    existingGroupId: string | undefined,
    txs: Array<Omit<Transaction, 'id' | 'createdAt'>>,
    toastText?: string
  ) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  deleteInstallmentGroup: (groupId: string) => void;

  addFixedExpense: (item: Omit<FixedExpenseItem, 'id'>) => void;
  updateFixedExpense: (item: FixedExpenseItem) => void;
  deleteFixedExpense: (id: string) => void;

  // Excel & reset
  handleImportExcel: (file: File) => Promise<void>;
  handleExportExcel: () => void;
  resetToSeedData: () => void;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

function loadStoredSession(): HouseholdSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HouseholdSession;
    if (parsed?.householdId && parsed?.pin) {
      return {
        ...parsed,
        mode: isFirebaseConfigured ? parsed.mode : 'local',
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function loadStoredUser(): UserName {
  const saved = localStorage.getItem(USER_KEY);
  return saved === 'סתיו' ? 'סתיו' : 'רום';
}

function loadStoredTheme(): boolean {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<HouseholdSession | null>(() => loadStoredSession());
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'local' | 'error'>(
    isFirebaseConfigured ? 'synced' : 'local'
  );

  const [activeUser, setActiveUserState] = useState<UserName>(() => loadStoredUser());
  const [darkMode, setDarkMode] = useState<boolean>(() => loadStoredTheme());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getTodayISO().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [categoryJumpFilter, setCategoryJumpFilter] = useState<string | null>(null);

  const [data, setData] = useState<BudgetData>(() => {
    const stored = loadStoredSession();
    if (stored) {
      const cached = readCachedHouseholdData(stored.householdId);
      if (cached) return cached;
    }
    return createSeedBudgetData();
  });
  const dataRef = useRef<BudgetData>(data);
  const isCloudReadyRef = useRef<boolean>(false);
  const writeSeqRef = useRef<number>(0);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (text: string, tone: ToastMessage['tone'] = 'success') => {
      const id = createId('toast');
      setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  // Apply Dark Mode class & iOS theme-color meta tag
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');

    const meta = document.getElementById('theme-color-meta');
    if (meta) {
      meta.setAttribute('content', darkMode ? '#0B0E14' : '#F8F9FA');
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const setActiveUser = useCallback((user: UserName) => {
    setActiveUserState(user);
    localStorage.setItem(USER_KEY, user);
  }, []);

  // Auto-join from URL parameters (?household=rom-stav&pin=1234)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlHousehold = params.get('household') || params.get('room');
    const urlPin = params.get('pin');
    if (urlHousehold && urlPin) {
      setIsConnecting(true);
      connectHousehold(urlHousehold, urlPin).then(({ session: newSession, error }) => {
        setIsConnecting(false);
        if (!error) {
          setSession(newSession);
          localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
          notify(`התחברתם למשק הבית "${newSession.householdId}"`);
        } else {
          notify(error, 'error');
        }
      });
    }
  }, [notify]);

  // Subscribe to Firestore or localStorage whenever session is active
  useEffect(() => {
    if (!session) {
      isCloudReadyRef.current = false;
      return;
    }
    isCloudReadyRef.current = session.mode !== 'firebase';
    setSyncState(session.mode === 'firebase' ? 'syncing' : 'local');

    const unsub = subscribeToHousehold(
      session,
      (incoming) => {
        isCloudReadyRef.current = true;
        dataRef.current = incoming;
        setData(incoming);
        setSyncState(session.mode === 'firebase' ? 'synced' : 'local');
      },
      () => {
        setSyncState('error');
        notify('שגיאת סנכרון מול הענן — בדקו חיבור לאינטרנט', 'error');
      }
    );

    return unsub;
  }, [session, notify]);

  const persistUpdate = useCallback(
    (updater: (prev: BudgetData) => BudgetData) => {
      if (session?.mode === 'firebase' && !isCloudReadyRef.current) {
        notify('ממתין לסנכרון ראשוני מהענן — נסו שוב בעוד שנייה', 'info');
        return;
      }

      const next = updater(dataRef.current);
      dataRef.current = next;
      setData(next);

      if (session) {
        const seq = ++writeSeqRef.current;
        if (session.mode === 'firebase') setSyncState('syncing');
        saveHouseholdData(session, next)
          .then(() => {
            if (seq === writeSeqRef.current) {
              setSyncState(session.mode === 'firebase' ? 'synced' : 'local');
            }
          })
          .catch(() => {
            if (seq === writeSeqRef.current) {
              setSyncState('error');
              notify('שמירה לענן נכשלה', 'error');
            }
          });
      }
    },
    [session, notify]
  );

  const joinHousehold = useCallback(
    async (householdId: string, pin: string): Promise<string | null> => {
      setIsConnecting(true);
      const { session: newSession, error } = await connectHousehold(householdId, pin);
      setIsConnecting(false);
      if (error) return error;

      setSession(newSession);
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      notify(
        newSession.mode === 'firebase'
          ? `מחובר בזמן אמת למשק בית "${newSession.householdId}"`
          : `נכנסתם למשק בית "${newSession.householdId}" (מצב מקומי)`
      );
      return null;
    },
    [notify]
  );

  const joinLocalQuickStart = useCallback(async () => {
    await joinHousehold('rom-stav', '2026');
  }, [joinHousehold]);

  const leaveHousehold = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    // Clean URL params if present
    const url = new URL(window.location.href);
    url.searchParams.delete('household');
    url.searchParams.delete('room');
    url.searchParams.delete('pin');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const copyShareLink = useCallback(async () => {
    if (!session) return;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('household', sanitizeHouseholdId(session.householdId));
    url.searchParams.set('pin', session.pin);
    try {
      await navigator.clipboard.writeText(url.toString());
      notify('קישור שיתוף למשק הבית הועתק! שלחו לרום / סתיו');
    } catch {
      notify('לא ניתן להעתיק אוטומטית — העתיקו מהדפדפן', 'info');
    }
  }, [session, notify]);

  const openQuickAdd = useCallback((tx: Transaction | null = null) => {
    setEditingTransaction(tx);
    setIsQuickAddOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setIsQuickAddOpen(false);
    setEditingTransaction(null);
  }, []);

  const jumpToCategoryTransactions = useCallback((category: string) => {
    setCategoryJumpFilter(category);
    setActiveTab('transactions');
  }, []);

  const clearCategoryJumpFilter = useCallback(() => {
    setCategoryJumpFilter(null);
  }, []);

  const updateCategoryTarget = useCallback(
    (category: string, target: number) => {
      const clean = Math.max(0, Math.round(target));
      persistUpdate((prev) => ({
        ...prev,
        targets: {
          ...prev.targets,
          [category]: clean,
        },
      }));
    },
    [persistUpdate]
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
      const newTx: Transaction = {
        ...tx,
        id: createId('tx'),
        createdAt: Date.now(),
      };
      persistUpdate((prev) => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
      }));
      notify(`${tx.type === 'הכנסה' ? 'הכנסה' : 'הוצאה'} נוספה בהצלחה`);
    },
    [persistUpdate, notify]
  );

  const addTransactionsBatch = useCallback(
    (txs: Array<Omit<Transaction, 'id' | 'createdAt'>>, toastText?: string) => {
      const now = Date.now();
      const created: Transaction[] = txs.map((tx, idx) => ({
        ...tx,
        id: createId(`tx-${idx + 1}`),
        createdAt: now + idx,
      }));
      persistUpdate((prev) => ({
        ...prev,
        transactions: [...created, ...prev.transactions],
      }));
      notify(toastText ?? `נוספו ${created.length} תשלומים בהצלחה`);
    },
    [persistUpdate, notify]
  );

  const replaceWithInstallments = useCallback(
    (
      originalId: string,
      existingGroupId: string | undefined,
      txs: Array<Omit<Transaction, 'id' | 'createdAt'>>,
      toastText?: string
    ) => {
      const now = Date.now();
      const created: Transaction[] = txs.map((tx, idx) => ({
        ...tx,
        id: idx === 0 ? originalId : createId(`tx-${idx + 1}`),
        createdAt: now + idx,
      }));
      persistUpdate((prev) => {
        const filtered = prev.transactions.filter((t) => {
          if (t.id === originalId) return false;
          if (existingGroupId && t.installmentGroupId === existingGroupId) return false;
          return true;
        });
        return {
          ...prev,
          transactions: [...created, ...filtered],
        };
      });
      notify(toastText ?? `סדרת ${created.length} תשלומים נשמרה בהצלחה`);
    },
    [persistUpdate, notify]
  );

  const updateTransaction = useCallback(
    (updated: Transaction) => {
      persistUpdate((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) => (t.id === updated.id ? updated : t)),
      }));
      notify('התנועה עודכנה');
    },
    [persistUpdate, notify]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      persistUpdate((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      }));
      notify('התנועה נמחקה', 'info');
    },
    [persistUpdate, notify]
  );

  const deleteInstallmentGroup = useCallback(
    (groupId: string) => {
      persistUpdate((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.installmentGroupId !== groupId),
      }));
      notify('כל סדרת התשלומים נמחקה', 'info');
    },
    [persistUpdate, notify]
  );

  const addFixedExpense = useCallback(
    (item: Omit<FixedExpenseItem, 'id'>) => {
      const created: FixedExpenseItem = {
        ...item,
        id: createId(`fix-${item.owner}`),
      };
      persistUpdate((prev) => ({
        ...prev,
        fixedExpenses: [...prev.fixedExpenses, created],
      }));
      notify('סעיף הוצאה קבועה נוסף');
    },
    [persistUpdate, notify]
  );

  const updateFixedExpense = useCallback(
    (updated: FixedExpenseItem) => {
      persistUpdate((prev) => ({
        ...prev,
        fixedExpenses: prev.fixedExpenses.map((f) => (f.id === updated.id ? updated : f)),
      }));
    },
    [persistUpdate]
  );

  const deleteFixedExpense = useCallback(
    (id: string) => {
      persistUpdate((prev) => ({
        ...prev,
        fixedExpenses: prev.fixedExpenses.filter((f) => f.id !== id),
      }));
      notify('הסעיף הוסר', 'info');
    },
    [persistUpdate, notify]
  );

  const handleImportExcel = useCallback(
    async (file: File) => {
      try {
        const result = await importBudgetFromExcel(file, data, activeUser);
        persistUpdate(() => result.data);
        notify(
          `יובא בהצלחה: ${result.importedTransactions} תנועות ו-${result.updatedTargets} יעדי תקציב`
        );
      } catch (err) {
        console.error('Excel import error:', err);
        notify('שגיאה בקריאת קובץ האקסל — ודאו שזהו קובץ .xlsx תקין', 'error');
      }
    },
    [data, activeUser, persistUpdate, notify]
  );

  const handleExportExcel = useCallback(() => {
    try {
      exportBudgetToExcel(data, selectedMonth);
      notify('קובץ האקסל יוצא עם 4 גיליונות');
    } catch (err) {
      console.error('Excel export error:', err);
      notify('שגיאה בייצוא קובץ האקסל', 'error');
    }
  }, [data, selectedMonth, notify]);

  const resetToSeedData = useCallback(() => {
    persistUpdate(() => createSeedBudgetData());
    setSelectedMonth('2026-11');
    setSelectedYear(2026);
    notify('נתוני נובמבר 2026 שוחזרו מהאקסל המקורי', 'info');
  }, [persistUpdate, notify]);

  const value = useMemo<BudgetContextValue>(
    () => ({
      session,
      isConnecting,
      syncState,
      firebaseReady: isFirebaseConfigured,
      activeUser,
      setActiveUser,
      darkMode,
      toggleDarkMode,
      activeTab,
      setActiveTab,
      selectedMonth,
      setSelectedMonth,
      selectedYear,
      setSelectedYear,
      isQuickAddOpen,
      editingTransaction,
      openQuickAdd,
      closeQuickAdd,
      categoryJumpFilter,
      jumpToCategoryTransactions,
      clearCategoryJumpFilter,
      data,
      toasts,
      notify,
      dismissToast,
      joinHousehold,
      joinLocalQuickStart,
      leaveHousehold,
      copyShareLink,
      updateCategoryTarget,
      addTransaction,
      addTransactionsBatch,
      replaceWithInstallments,
      updateTransaction,
      deleteTransaction,
      deleteInstallmentGroup,
      addFixedExpense,
      updateFixedExpense,
      deleteFixedExpense,
      handleImportExcel,
      handleExportExcel,
      resetToSeedData,
    }),
    [
      session,
      isConnecting,
      syncState,
      activeUser,
      setActiveUser,
      darkMode,
      toggleDarkMode,
      activeTab,
      selectedMonth,
      selectedYear,
      isQuickAddOpen,
      editingTransaction,
      openQuickAdd,
      closeQuickAdd,
      categoryJumpFilter,
      jumpToCategoryTransactions,
      clearCategoryJumpFilter,
      data,
      toasts,
      notify,
      dismissToast,
      joinHousehold,
      joinLocalQuickStart,
      leaveHousehold,
      copyShareLink,
      updateCategoryTarget,
      addTransaction,
      addTransactionsBatch,
      replaceWithInstallments,
      updateTransaction,
      deleteTransaction,
      deleteInstallmentGroup,
      addFixedExpense,
      updateFixedExpense,
      deleteFixedExpense,
      handleImportExcel,
      handleExportExcel,
      resetToSeedData,
    ]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used inside BudgetProvider');
  return ctx;
}
