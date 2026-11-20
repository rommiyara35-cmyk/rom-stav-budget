export type UserName = 'רום' | 'סתיו';

export type TransactionType = 'הוצאה' | 'הכנסה';

export type PaymentMethod =
  | 'אשראי'
  | 'מזומן'
  | 'העברה בנקאית'
  | 'ביט/פייבוקס'
  | 'הוראת קבע';

export type FixedOwner = 'rom' | 'stav';

export type ActiveTab = 'dashboard' | 'transactions' | 'fixed' | 'annual';

export type IncomeCategory =
  | 'משכורת רום'
  | 'משכורת סתיו'
  | 'הכנסה נוספת / בונוס'
  | 'החזרים / מתנות';

export type ExpenseCategory =
  | 'הוצאות קבועות רום'
  | 'הוצאות קבועות סתיו'
  | 'דלק'
  | 'רב קו'
  | 'וולט ואוכל'
  | 'אוכל וחטיפים לכלב'
  | 'שונות'
  | 'שופינג'
  | 'יציאות'
  | 'כסף לחיסכון'
  | 'כסף להשקעות';

export type CategoryName = IncomeCategory | ExpenseCategory;

export interface CategoryMeta {
  name: CategoryName;
  type: TransactionType;
  description: string;
  color: string;
  emoji: string;
  defaultTarget: number;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: CategoryName;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  loggedBy: UserName;
  createdAt: number;
}

export interface FixedExpenseItem {
  id: string;
  owner: FixedOwner;
  name: string;
  planned: number;
  paid: number;
  paymentMethod: PaymentMethod;
  billingDay: number; // 1-31
  notes: string;
}

export interface BudgetData {
  /** Category targets in ₪, keyed by CategoryName */
  targets: Record<string, number>;
  transactions: Transaction[];
  fixedExpenses: FixedExpenseItem[];
  updatedAt: number;
}

export interface HouseholdSession {
  householdId: string;
  pin: string;
  mode: 'firebase' | 'local';
}

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'success' | 'error' | 'info';
}

export const INCOME_CATEGORIES: CategoryMeta[] = [
  {
    name: 'משכורת רום',
    type: 'הכנסה',
    description: 'שכר עבודה חודשי נטו — רום',
    color: '#10b981',
    emoji: '💼',
    defaultTarget: 9000,
  },
  {
    name: 'משכורת סתיו',
    type: 'הכנסה',
    description: 'שכר עבודה חודשי נטו — סתיו',
    color: '#14b8a6',
    emoji: '💼',
    defaultTarget: 5200,
  },
  {
    name: 'הכנסה נוספת / בונוס',
    type: 'הכנסה',
    description: 'שעות נוספות, פרילנס, מענקים או עבודה צדדית',
    color: '#06b6d4',
    emoji: '✨',
    defaultTarget: 0,
  },
  {
    name: 'החזרים / מתנות',
    type: 'הכנסה',
    description: 'החזרי הוצאות, העברות ביט/פייבוקס או מתנות',
    color: '#22c55e',
    emoji: '🎁',
    defaultTarget: 0,
  },
];

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  {
    name: 'הוצאות קבועות רום',
    type: 'הוצאה',
    description: 'התחייבויות, חשבונות ומנויים קבועים של רום (מסונכרן מהוצאות קבועות ויומן תנועות)',
    color: '#4f46e5',
    emoji: '🏠',
    defaultTarget: 2000,
  },
  {
    name: 'הוצאות קבועות סתיו',
    type: 'הוצאה',
    description: 'התחייבויות, חשבונות ומנויים קבועים של סתיו (מסונכרן מהוצאות קבועות ויומן תנועות)',
    color: '#7c3aed',
    emoji: '🏡',
    defaultTarget: 4381,
  },
  {
    name: 'דלק',
    type: 'הוצאה',
    description: 'תדלוק והוצאות רכב שוטפות',
    color: '#f59e0b',
    emoji: '⛽',
    defaultTarget: 1000,
  },
  {
    name: 'רב קו',
    type: 'הוצאה',
    description: 'טעינת רב-קו, רכבת, אוטובוסים ותחבורה ציבורית',
    color: '#0ea5e9',
    emoji: '🚆',
    defaultTarget: 350,
  },
  {
    name: 'וולט ואוכל',
    type: 'הוצאה',
    description: 'משלוחי אוכל (Wolt), מסעדות, בתי קפה וקניות מזון',
    color: '#f97316',
    emoji: '🍔',
    defaultTarget: 400,
  },
  {
    name: 'אוכל וחטיפים לכלב',
    type: 'הוצאה',
    description: 'מזון, חטיפים, צעצועים וציוד שוטף ללופי',
    color: '#84cc16',
    emoji: '🐶',
    defaultTarget: 150,
  },
  {
    name: 'שונות',
    type: 'הוצאה',
    description: 'פארם, טיפוח, משתלה והוצאות שוטפות מגוונות',
    color: '#64748b',
    emoji: '🧴',
    defaultTarget: 250,
  },
  {
    name: 'שופינג',
    type: 'הוצאה',
    description: 'ביגוד, הנעלה, אקססוריז וקניות אישיות',
    color: '#ec4899',
    emoji: '🛍️',
    defaultTarget: 1500,
  },
  {
    name: 'יציאות',
    type: 'הוצאה',
    description: 'בילויים, ברים, עגלות קפה, חניונים ופנאי',
    color: '#8b5cf6',
    emoji: '🍸',
    defaultTarget: 700,
  },
  {
    name: 'כסף לחיסכון',
    type: 'הוצאה',
    description: 'הפקדות לפיקדון, קרן חירום או חיסכון ייעודי',
    color: '#06b6d4',
    emoji: '🏦',
    defaultTarget: 0,
  },
  {
    name: 'כסף להשקעות',
    type: 'הוצאה',
    description: 'הפקדות לשוק ההון, בלינק, קופת גמל להשקעה',
    color: '#10b981',
    emoji: '📈',
    defaultTarget: 600,
  },
];

export const ALL_CATEGORIES: CategoryMeta[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  ALL_CATEGORIES.map((c) => [c.name, c])
);

export const PAYMENT_METHODS: PaymentMethod[] = [
  'אשראי',
  'מזומן',
  'העברה בנקאית',
  'ביט/פייבוקס',
  'הוראת קבע',
];

export const HEBREW_MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
] as const;

export const USERS: UserName[] = ['רום', 'סתיו'];
