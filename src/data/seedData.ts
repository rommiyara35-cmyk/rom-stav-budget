import {
  ALL_CATEGORIES,
  BudgetData,
  FixedExpenseItem,
  Transaction,
} from '../types/budget';

export const DEFAULT_TARGETS: Record<string, number> = Object.fromEntries(
  ALL_CATEGORIES.map((c) => [c.name, c.defaultTarget])
);

const DEFAULT_FIXED_TEMPLATE: Omit<FixedExpenseItem, 'id' | 'owner'>[] = [
  {
    name: 'שכר דירה / משכנתא',
    planned: 0,
    paid: 0,
    paymentMethod: 'הוראת קבע',
    billingDay: 1,
    notes: 'תשלום דיור חודשי קבוע',
  },
  {
    name: 'ארנונה וחשבונות בית',
    planned: 0,
    paid: 0,
    paymentMethod: 'הוראת קבע',
    billingDay: 10,
    notes: 'חשמל, מים, גז וועד בית',
  },
  {
    name: 'חבילת סלולר ואינטרנט',
    planned: 0,
    paid: 0,
    paymentMethod: 'אשראי',
    billingDay: 15,
    notes: 'מנוי סלולר, אינטרנט וטלוויזיה',
  },
  {
    name: 'מנויים דיגיטליים וסטרימינג',
    planned: 0,
    paid: 0,
    paymentMethod: 'אשראי',
    billingDay: 10,
    notes: 'נטפליקס, ספוטיפיי, אפליקציות וענן',
  },
  {
    name: 'ביטוחים וקופת חולים',
    planned: 0,
    paid: 0,
    paymentMethod: 'הוראת קבע',
    billingDay: 5,
    notes: 'ביטוח בריאות, רכב, חיים וקופת חולים',
  },
  {
    name: 'חדר כושר / אימונים',
    planned: 0,
    paid: 0,
    paymentMethod: 'אשראי',
    billingDay: 1,
    notes: 'מנוי כושר, פילאטיס או פעילות קבועה',
  },
  {
    name: 'הלוואות / פריסת תשלומים',
    planned: 0,
    paid: 0,
    paymentMethod: 'הוראת קבע',
    billingDay: 10,
    notes: 'החזרים קבועים או התחייבויות חודשיות',
  },
  {
    name: 'הוצאה קבועה נוספת',
    planned: 0,
    paid: 0,
    paymentMethod: 'אשראי',
    billingDay: 10,
    notes: 'כל הוצאה חודשית קבועה נוספת',
  },
];

/**
 * Seeded Fixed Expenses matching income_expenses_tracker-3.xlsx:
 * - Rom fixed total in November 2026 summary = 2,000 ₪ (1,756 ₪ here + 244 ₪ "סוני" transaction in log = 2,000 ₪)
 * - Stav fixed total in November 2026 summary = 4,381 ₪
 */
export const SEED_FIXED_EXPENSES: FixedExpenseItem[] = [
  ...DEFAULT_FIXED_TEMPLATE.map((item, idx) => ({
    ...item,
    id: `fixed-rom-${idx + 1}`,
    owner: 'rom' as const,
    ...(idx === 7
      ? {
          planned: 1756,
          paid: 1756,
          notes: 'סכום קבוע כללי מהאקסל (יחד עם חיוב סוני ביומן = 2,000 ₪)',
        }
      : {}),
  })),
  ...DEFAULT_FIXED_TEMPLATE.map((item, idx) => ({
    ...item,
    id: `fixed-stav-${idx + 1}`,
    owner: 'stav' as const,
    ...(idx === 7
      ? {
          planned: 4381,
          paid: 4381,
          notes: 'סכום קבוע כללי מהאקסל (ניתן לפצל לסעיפים למעלה)',
        }
      : {}),
  })),
];

/**
 * Exact November 2026 transactions imported from income_expenses_tracker-3.xlsx
 * Total Income: 14,200 ₪ (Rom 9,000 + Stav 5,200)
 * Total Expenses & Savings (incl. Fixed): 11,063 ₪
 * Net Monthly Balance: +3,137 ₪
 */
export const SEED_TRANSACTIONS: Transaction[] = [
  // Monthly Salaries (from סיכום חודשי R11-R12)
  {
    id: 'seed-inc-1',
    date: '2026-11-01',
    type: 'הכנסה',
    category: 'משכורת רום',
    description: 'משכורת חודש נובמבר',
    amount: 9000,
    paymentMethod: 'העברה בנקאית',
    loggedBy: 'רום',
    createdAt: 1793491200000,
  },
  {
    id: 'seed-inc-2',
    date: '2026-11-01',
    type: 'הכנסה',
    category: 'משכורת סתיו',
    description: 'משכורת חודש נובמבר',
    amount: 5200,
    paymentMethod: 'העברה בנקאית',
    loggedBy: 'סתיו',
    createdAt: 1793491260000,
  },
  // All 36 exact expense rows from יומן תנועות (R06–R41)
  { id: 'seed-tx-01', date: '2026-11-10', type: 'הוצאה', category: 'שופינג', description: 'שרשרת', amount: 350, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794268800000 },
  { id: 'seed-tx-02', date: '2026-11-10', type: 'הוצאה', category: 'יציאות', description: 'שרונה מרקט', amount: 140, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794268860000 },
  { id: 'seed-tx-03', date: '2026-11-10', type: 'הוצאה', category: 'וולט ואוכל', description: 'שייק', amount: 30, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794268920000 },
  { id: 'seed-tx-04', date: '2026-11-10', type: 'הוצאה', category: 'דלק', description: 'תדלוק', amount: 241, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794268980000 },
  { id: 'seed-tx-05', date: '2026-11-11', type: 'הוצאה', category: 'שופינג', description: 'אוזניות', amount: 92, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794355200000 },
  { id: 'seed-tx-06', date: '2026-11-11', type: 'הוצאה', category: 'רב קו', description: 'רב קו', amount: 50, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794355260000 },
  { id: 'seed-tx-07', date: '2026-11-11', type: 'הוצאה', category: 'רב קו', description: 'תחבצ', amount: 23, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794355320000 },
  { id: 'seed-tx-08', date: '2026-11-11', type: 'הוצאה', category: 'שופינג', description: 'נעליים', amount: 299, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794355380000 },
  { id: 'seed-tx-09', date: '2026-11-11', type: 'הוצאה', category: 'וולט ואוכל', description: 'אגרול', amount: 36, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794355440000 },
  { id: 'seed-tx-10', date: '2026-11-11', type: 'הוצאה', category: 'יציאות', description: 'חניון', amount: 23, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794355500000 },
  { id: 'seed-tx-11', date: '2026-11-11', type: 'הוצאה', category: 'וולט ואוכל', description: 'כבישתיש', amount: 88, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794355560000 },
  { id: 'seed-tx-12', date: '2026-11-11', type: 'הוצאה', category: 'וולט ואוכל', description: 'וולט', amount: 150, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794355620000 },
  { id: 'seed-tx-13', date: '2026-11-12', type: 'הוצאה', category: 'וולט ואוכל', description: 'מסעדה', amount: 316, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794441600000 },
  { id: 'seed-tx-14', date: '2026-11-12', type: 'הוצאה', category: 'יציאות', description: 'סופגניה', amount: 15, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794441660000 },
  { id: 'seed-tx-15', date: '2026-11-13', type: 'הוצאה', category: 'וולט ואוכל', description: 'מינימרקט', amount: 22, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794528000000 },
  { id: 'seed-tx-16', date: '2026-11-15', type: 'הוצאה', category: 'וולט ואוכל', description: 'כבישתיש', amount: 102, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794700800000 },
  { id: 'seed-tx-17', date: '2026-11-16', type: 'הוצאה', category: 'אוכל וחטיפים לכלב', description: 'אוכל ללופי', amount: 40, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794787200000 },
  { id: 'seed-tx-18', date: '2026-11-16', type: 'הוצאה', category: 'וולט ואוכל', description: 'סופר', amount: 18, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794787260000 },
  { id: 'seed-tx-19', date: '2026-11-16', type: 'הוצאה', category: 'שופינג', description: 'גמבו', amount: 60, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794787320000 },
  { id: 'seed-tx-20', date: '2026-11-16', type: 'הוצאה', category: 'שונות', description: 'משתלה', amount: 55, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794787380000 },
  { id: 'seed-tx-21', date: '2026-11-16', type: 'הוצאה', category: 'שופינג', description: 'פליינג טייגר', amount: 109, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794787440000 },
  { id: 'seed-tx-22', date: '2026-11-16', type: 'הוצאה', category: 'שופינג', description: 'אלי אקספרס', amount: 55, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794787500000 },
  { id: 'seed-tx-23', date: '2026-11-16', type: 'הוצאה', category: 'שופינג', description: 'מסגרת וכוכב', amount: 89, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794787560000 },
  { id: 'seed-tx-24', date: '2026-11-16', type: 'הוצאה', category: 'כסף להשקעות', description: 'בלינק', amount: 655, paymentMethod: 'העברה בנקאית', loggedBy: 'רום', createdAt: 1794787620000 },
  { id: 'seed-tx-25', date: '2026-11-17', type: 'הוצאה', category: 'שונות', description: 'גל גבות', amount: 80, paymentMethod: 'ביט/פייבוקס', loggedBy: 'סתיו', createdAt: 1794873600000 },
  { id: 'seed-tx-26', date: '2026-11-17', type: 'הוצאה', category: 'שונות', description: 'אטנט', amount: 100, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794873660000 },
  { id: 'seed-tx-27', date: '2026-11-17', type: 'הוצאה', category: 'כסף להשקעות', description: 'בלינק', amount: 320, paymentMethod: 'העברה בנקאית', loggedBy: 'רום', createdAt: 1794873720000 },
  { id: 'seed-tx-28', date: '2026-11-18', type: 'הוצאה', category: 'שופינג', description: 'נעליים', amount: 132, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794960000000 },
  { id: 'seed-tx-29', date: '2026-11-18', type: 'הוצאה', category: 'דלק', description: 'תדלוק', amount: 242, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1794960060000 },
  { id: 'seed-tx-30', date: '2026-11-18', type: 'הוצאה', category: 'יציאות', description: 'טי בר וסינבון', amount: 61, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1794960120000 },
  { id: 'seed-tx-31', date: '2026-11-19', type: 'הוצאה', category: 'שונות', description: 'חוברת לאלני', amount: 25, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1795046400000 },
  { id: 'seed-tx-32', date: '2026-11-19', type: 'הוצאה', category: 'שופינג', description: 'ביגודית', amount: 60, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1795046460000 },
  { id: 'seed-tx-33', date: '2026-11-19', type: 'הוצאה', category: 'שונות', description: 'אגרה ללופי', amount: 439, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1795046520000 },
  { id: 'seed-tx-34', date: '2026-11-20', type: 'הוצאה', category: 'הוצאות קבועות רום', description: 'סוני', amount: 244, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1795132800000 },
  { id: 'seed-tx-35', date: '2026-11-20', type: 'הוצאה', category: 'יציאות', description: 'חניון', amount: 36, paymentMethod: 'אשראי', loggedBy: 'רום', createdAt: 1795132860000 },
  { id: 'seed-tx-36', date: '2026-11-20', type: 'הוצאה', category: 'יציאות', description: 'עגלת קפה', amount: 129, paymentMethod: 'אשראי', loggedBy: 'סתיו', createdAt: 1795132920000 },
];

export function createSeedBudgetData(): BudgetData {
  return {
    targets: { ...DEFAULT_TARGETS },
    transactions: SEED_TRANSACTIONS.map((t) => ({ ...t })),
    fixedExpenses: SEED_FIXED_EXPENSES.map((f) => ({ ...f })),
    updatedAt: Date.now(),
  };
}
