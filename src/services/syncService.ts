import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { createSeedBudgetData } from '../data/seedData';
import { BudgetData, HouseholdSession } from '../types/budget';
import { db, isFirebaseConfigured } from './firebase';

const LOCAL_DATA_PREFIX = 'rom_stav_budget_data_v1::';
const LOCAL_PIN_PREFIX = 'rom_stav_budget_pin_v1::';

export function sanitizeHouseholdId(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'rom-stav';
}

function getLocalStorageKey(householdId: string): string {
  return `${LOCAL_DATA_PREFIX}${sanitizeHouseholdId(householdId)}`;
}

function getLocalPinKey(householdId: string): string {
  return `${LOCAL_PIN_PREFIX}${sanitizeHouseholdId(householdId)}`;
}

export function readCachedHouseholdData(householdId: string): BudgetData | null {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(householdId));
    if (raw) {
      const parsed = JSON.parse(raw) as BudgetData;
      if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.fixedExpenses)) {
        return parsed;
      }
    }
  } catch {
    // ignore invalid cache
  }
  return null;
}

function readLocalData(householdId: string): BudgetData {
  const cached = readCachedHouseholdData(householdId);
  if (cached) return cached;
  const seed = createSeedBudgetData();
  writeLocalData(householdId, seed);
  return seed;
}

function writeLocalData(householdId: string, data: BudgetData): void {
  try {
    localStorage.setItem(getLocalStorageKey(householdId), JSON.stringify(data));
  } catch (err) {
    console.warn('Failed writing local budget data:', err);
  }
}

export async function connectHousehold(
  rawHouseholdId: string,
  pin: string
): Promise<{ session: HouseholdSession; error?: string }> {
  const householdId = sanitizeHouseholdId(rawHouseholdId);
  const cleanPin = pin.trim();

  if (!cleanPin || cleanPin.length < 4) {
    return {
      session: { householdId, pin: cleanPin, mode: 'local' },
      error: 'יש להזין קוד PIN בן 4 ספרות לפחות',
    };
  }

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'households', householdId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const stored = snap.data() as { pin?: string };
        if (stored.pin && stored.pin !== cleanPin) {
          return {
            session: { householdId, pin: cleanPin, mode: 'firebase' },
            error: 'קוד ה-PIN שגוי עבור משק בית זה',
          };
        }
      } else {
        const seed = createSeedBudgetData();
        await setDoc(docRef, {
          pin: cleanPin,
          ...seed,
        });
      }

      return {
        session: { householdId, pin: cleanPin, mode: 'firebase' },
      };
    } catch (err) {
      console.error('Firestore connect error:', err);
      return {
        session: { householdId, pin: cleanPin, mode: 'local' },
        error: 'לא ניתן להתחבר ל-Firebase כרגע. בדקו את הגדרות ה-.env או התחברו במצב מקומי.',
      };
    }
  }

  // Local mode PIN check / creation
  const pinKey = getLocalPinKey(householdId);
  const savedPin = localStorage.getItem(pinKey);
  if (savedPin && savedPin !== cleanPin) {
    return {
      session: { householdId, pin: cleanPin, mode: 'local' },
      error: 'קוד ה-PIN שגוי למשק הבית המקומי הזה',
    };
  }
  if (!savedPin) {
    localStorage.setItem(pinKey, cleanPin);
  }
  readLocalData(householdId);

  return {
    session: { householdId, pin: cleanPin, mode: 'local' },
  };
}

export function subscribeToHousehold(
  session: HouseholdSession,
  onData: (data: BudgetData) => void,
  onError?: (err: Error) => void
): () => void {
  if (session.mode === 'firebase' && db) {
    const docRef = doc(db, 'households', session.householdId);
    const unsub = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.data() as Partial<BudgetData>;
          const fallback = createSeedBudgetData();
          const hydrated: BudgetData = {
            targets: raw.targets ?? fallback.targets,
            transactions: Array.isArray(raw.transactions)
              ? raw.transactions
              : fallback.transactions,
            fixedExpenses: Array.isArray(raw.fixedExpenses)
              ? raw.fixedExpenses
              : fallback.fixedExpenses,
            updatedAt: raw.updatedAt ?? Date.now(),
          };
          // Cache latest cloud state locally for fast next paint
          writeLocalData(session.householdId, hydrated);
          onData(hydrated);
        }
      },
      (err) => {
        console.error('Firestore onSnapshot error:', err);
        onError?.(err);
      }
    );
    return unsub;
  }

  // LocalStorage + live cross-tab sync
  onData(readLocalData(session.householdId));

  const storageKey = getLocalStorageKey(session.householdId);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as BudgetData;
        onData(parsed);
      } catch {
        // ignore invalid payload
      }
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

export async function saveHouseholdData(
  session: HouseholdSession,
  data: BudgetData
): Promise<void> {
  const payload: BudgetData = {
    ...data,
    updatedAt: Date.now(),
  };

  if (session.mode === 'firebase' && db) {
    const docRef = doc(db, 'households', session.householdId);
    await setDoc(
      docRef,
      {
        pin: session.pin,
        ...payload,
      },
      { merge: true }
    );
    return;
  }

  writeLocalData(session.householdId, payload);
}
