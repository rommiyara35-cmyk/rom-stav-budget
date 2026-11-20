import * as XLSX from 'xlsx';
import {
  ALL_CATEGORIES,
  BudgetData,
  CategoryName,
  EXPENSE_CATEGORIES,
  FixedExpenseItem,
  HEBREW_MONTHS,
  INCOME_CATEGORIES,
  PaymentMethod,
  Transaction,
  TransactionType,
  UserName,
} from '../types/budget';
import { computeAnnualSummary, computeMonthlySummary } from './calculations';
import { createId, formatShortDate, parseMonthKey } from './format';

const VALID_CATEGORIES = new Set<string>(ALL_CATEGORIES.map((c) => c.name));
const INCOME_CATEGORY_SET = new Set<string>(INCOME_CATEGORIES.map((c) => c.name));
const EXPENSE_CATEGORY_SET = new Set<string>(EXPENSE_CATEGORIES.map((c) => c.name));

function normalizePaymentMethod(raw: unknown): PaymentMethod {
  const str = String(raw ?? '').trim();
  if (!str) return 'אשראי';
  if (str.includes('ביט') || str.includes('פייבוקס')) return 'ביט/פייבוקס';
  if (str.includes('הוראת קבע')) return 'הוראת קבע';
  if (str.includes('העברה')) return 'העברה בנקאית';
  if (str.includes('מזומן')) return 'מזומן';
  return 'אשראי';
}

function normalizeCategory(raw: unknown, type: TransactionType): CategoryName {
  const str = String(raw ?? '').trim();
  if (type === 'הכנסה' && INCOME_CATEGORY_SET.has(str)) {
    return str as CategoryName;
  }
  if (type === 'הוצאה' && EXPENSE_CATEGORY_SET.has(str)) {
    return str as CategoryName;
  }
  return type === 'הכנסה' ? 'הכנסה נוספת / בונוס' : 'שונות';
}

function parseExcelDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof raw === 'number' && raw > 20000) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }

  const str = String(raw).trim();
  // Match DD.MM.YY or DD.MM.YYYY or DD/MM/YY
  const dmy = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    let year = dmy[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Match YYYY-MM-DD
  const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  return null;
}

function toNum(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[₪,\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export interface ExcelImportResult {
  data: BudgetData;
  importedTransactions: number;
  updatedTargets: number;
  importedFixed: number;
}

export async function importBudgetFromExcel(
  file: File,
  currentData: BudgetData,
  defaultUser: UserName
): Promise<ExcelImportResult> {
  const buffer = await file.arrayBuffer();
  // Read raw Excel serial dates (cellDates: false) to avoid timezone/DST -1 day shifts
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

  const targets: Record<string, number> = { ...currentData.targets };
  let updatedTargets = 0;
  let summaryMonthKey = '2026-11';
  const summarySalaries: Array<{ category: CategoryName; amount: number; user: UserName }> = [];
  let summaryFixedRomActual = 0;
  let summaryFixedStavActual = 0;

  // 1. Parse "סיכום חודשי"
  const summarySheet = workbook.Sheets['סיכום חודשי'];
  if (summarySheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(summarySheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    // Dynamically find period row (supports both original Excel row 4 and exported app row 3)
    for (let i = 0; i < Math.min(8, rows.length); i++) {
      const r = rows[i];
      if (!Array.isArray(r)) continue;
      if (String(r[0] ?? '').includes('חודש תצוגה')) {
        const mName = String(r[1] ?? '').trim();
        const yr = toNum(r[3]) || 2026;
        const mIdx = HEBREW_MONTHS.indexOf(mName as (typeof HEBREW_MONTHS)[number]);
        if (mIdx >= 0) {
          summaryMonthKey = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
        }
        break;
      }
    }

    for (const row of rows) {
      if (!Array.isArray(row) || !row[0]) continue;
      const cat = String(row[0]).trim();
      if (!VALID_CATEGORIES.has(cat)) continue;

      const targetVal = toNum(row[1]);
      const actualVal = toNum(row[2]);

      if (row[1] !== null && row[1] !== '') {
        targets[cat] = targetVal;
        updatedTargets++;
      } else if (
        (cat === 'משכורת רום' || cat === 'משכורת סתיו') &&
        actualVal > 0 &&
        !targets[cat]
      ) {
        targets[cat] = actualVal;
      }

      if ((cat === 'משכורת רום' || cat === 'משכורת סתיו') && actualVal > 0) {
        summarySalaries.push({
          category: cat as CategoryName,
          amount: actualVal,
          user: cat === 'משכורת רום' ? 'רום' : 'סתיו',
        });
      }
      if (cat === 'הוצאות קבועות רום' && actualVal > 0) {
        summaryFixedRomActual = actualVal;
      }
      if (cat === 'הוצאות קבועות סתיו' && actualVal > 0) {
        summaryFixedStavActual = actualVal;
      }
    }
  }

  // 2. Parse "יומן תנועות"
  const txSheet = workbook.Sheets['יומן תנועות'];
  const parsedTxs: Transaction[] = [];
  if (txSheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(txSheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    // Find header row containing "תאריך"
    let startIdx = 5;
    for (let i = 0; i < Math.min(12, rows.length); i++) {
      const firstCell = String(rows[i]?.[0] ?? '').trim();
      if (firstCell.includes('תאריך')) {
        startIdx = i + 1;
        break;
      }
    }

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const dateStr = parseExcelDate(row[0]);
      const amount = toNum(row[4]);
      if (!dateStr || amount <= 0) continue;

      const rawType = String(row[1] ?? '').trim();
      const type: TransactionType = rawType === 'הכנסה' ? 'הכנסה' : 'הוצאה';
      const category = normalizeCategory(row[2], type);
      const description = String(row[3] ?? '').trim() || category;
      const paymentMethod = normalizePaymentMethod(row[5]);
      const rawUser = String(row[6] ?? '').trim();
      const loggedBy: UserName =
        rawUser === 'רום' || rawUser === 'סתיו' ? rawUser : defaultUser;

      parsedTxs.push({
        id: createId('imp'),
        date: dateStr,
        type,
        category,
        description,
        amount,
        paymentMethod,
        loggedBy,
        createdAt: Date.now() + i,
      });
    }
  }

  // Ensure hardcoded salaries from summary sheet exist as income transactions for that month
  for (const sal of summarySalaries) {
    const alreadyExists = parsedTxs.some(
      (t) =>
        t.type === 'הכנסה' &&
        t.category === sal.category &&
        t.date.startsWith(summaryMonthKey)
    );
    if (!alreadyExists) {
      parsedTxs.unshift({
        id: createId('imp-sal'),
        date: `${summaryMonthKey}-01`,
        type: 'הכנסה',
        category: sal.category,
        description: `משכורת (${summaryMonthKey})`,
        amount: sal.amount,
        paymentMethod: 'העברה בנקאית',
        loggedBy: sal.user,
        createdAt: Date.now(),
      });
    }
  }

  // 3. Parse "פירוט הוצאות קבועות"
  const fixedSheet = workbook.Sheets['פירוט הוצאות קבועות'];
  const parsedFixed: FixedExpenseItem[] = [];
  if (fixedSheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(fixedSheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    let currentOwner: 'rom' | 'stav' | null = null;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || !row[0]) continue;
      const label = String(row[0]).trim();

      if (label.includes('סעיף הוצאה קבועה') && label.includes('רום')) {
        currentOwner = 'rom';
        continue;
      }
      if (label.includes('סעיף הוצאה קבועה') && label.includes('סתיו')) {
        currentOwner = 'stav';
        continue;
      }
      if (label.startsWith('סה"כ')) {
        currentOwner = null;
        continue;
      }

      if (currentOwner) {
        parsedFixed.push({
          id: createId(`fix-${currentOwner}`),
          owner: currentOwner,
          name: label,
          planned: toNum(row[1]),
          paid: toNum(row[2]),
          paymentMethod: normalizePaymentMethod(row[4]),
          billingDay: Math.max(1, Math.min(31, toNum(row[5]) || 10)),
          notes: String(row[6] ?? '').trim(),
        });
      }
    }
  }

  // If fixed sheet had rows with all zeros, reconcile with hardcoded summary fixed values
  const romFixedSum = parsedFixed
    .filter((f) => f.owner === 'rom')
    .reduce((s, f) => s + f.paid, 0);
  const stavFixedSum = parsedFixed
    .filter((f) => f.owner === 'stav')
    .reduce((s, f) => s + f.paid, 0);

  if (parsedFixed.length > 0 && romFixedSum === 0 && summaryFixedRomActual > 0) {
    const txRomFixed = parsedTxs
      .filter(
        (t) =>
          t.type === 'הוצאה' &&
          t.category === 'הוצאות קבועות רום' &&
          t.date.startsWith(summaryMonthKey)
      )
      .reduce((s, t) => s + t.amount, 0);
    const remainder = Math.max(0, summaryFixedRomActual - txRomFixed);
    const lastRom = [...parsedFixed].reverse().find((f) => f.owner === 'rom');
    if (lastRom && remainder > 0) {
      lastRom.planned = remainder;
      lastRom.paid = remainder;
    }
  }

  if (parsedFixed.length > 0 && stavFixedSum === 0 && summaryFixedStavActual > 0) {
    const txStavFixed = parsedTxs
      .filter(
        (t) =>
          t.type === 'הוצאה' &&
          t.category === 'הוצאות קבועות סתיו' &&
          t.date.startsWith(summaryMonthKey)
      )
      .reduce((s, t) => s + t.amount, 0);
    const remainder = Math.max(0, summaryFixedStavActual - txStavFixed);
    const lastStav = [...parsedFixed].reverse().find((f) => f.owner === 'stav');
    if (lastStav && remainder > 0) {
      lastStav.planned = remainder;
      lastStav.paid = remainder;
    }
  }

  const finalTransactions = parsedTxs.length > 0 ? parsedTxs : currentData.transactions;
  const finalFixed = parsedFixed.length > 0 ? parsedFixed : currentData.fixedExpenses;

  return {
    data: {
      targets,
      transactions: finalTransactions,
      fixedExpenses: finalFixed,
      updatedAt: Date.now(),
    },
    importedTransactions: parsedTxs.length,
    updatedTargets,
    importedFixed: parsedFixed.length,
  };
}

export function exportBudgetToExcel(data: BudgetData, monthKey: string): void {
  const { year, monthIndex0 } = parseMonthKey(monthKey);
  const monthName = HEBREW_MONTHS[monthIndex0];
  const summary = computeMonthlySummary(data, monthKey);
  const annual = computeAnnualSummary(data, year);

  const wb = XLSX.utils.book_new();

  // --- Sheet 1: סיכום חודשי ---
  const summaryRows: unknown[][] = [
    ['מעקב הכנסות והוצאות חודשי (רום וסתיו) — תמונת מצב ותקציב'],
    [],
    ['חודש תצוגה:', monthName, 'שנה:', year, 'תקופה:', monthKey],
    [],
    ['סה"כ הכנסות בפועל', summary.totalIncomeActual, 'סה"כ הוצאות וחיסכון בפועל', summary.totalExpenseActual, 'יתרה חודשית פנויה (נטו)', summary.netBalance],
    [],
    ['קטגוריית הכנסה', 'תקציב יעד (₪)', 'בפועל (₪)', 'הפרש מיעד (₪)', '% ביצוע', 'הערות והסבר'],
    ...summary.incomeRows.map((r) => [
      r.meta.name,
      r.target,
      r.actual,
      r.difference,
      r.target > 0 ? `${Math.round(r.ratio * 100)}%` : '0%',
      r.meta.description,
    ]),
    [
      'סה"כ הכנסות',
      summary.totalIncomeTarget,
      summary.totalIncomeActual,
      summary.totalIncomeActual - summary.totalIncomeTarget,
      summary.totalIncomeTarget > 0
        ? `${Math.round((summary.totalIncomeActual / summary.totalIncomeTarget) * 100)}%`
        : '0%',
      'סיכום כלל מקורות ההכנסה בחודש',
    ],
    [],
    ['קטגוריית הוצאה / חיסכון', 'תקציב יעד (₪)', 'בפועל (₪)', 'יתרת תקציב (₪)', '% ניצול תקציב', 'פירוט והסבר לקטגוריה'],
    ...summary.expenseRows.map((r) => [
      r.meta.name,
      r.target,
      r.actual,
      r.difference,
      r.target > 0 ? `${Math.round(r.ratio * 100)}%` : '0%',
      r.meta.description,
    ]),
    [
      'סה"כ הוצאות, חיסכון והשקעות',
      summary.totalExpenseTarget,
      summary.totalExpenseActual,
      summary.totalExpenseTarget - summary.totalExpenseActual,
      summary.totalExpenseTarget > 0
        ? `${Math.round((summary.totalExpenseActual / summary.totalExpenseTarget) * 100)}%`
        : '0%',
      'סיכום כלל ההוצאות, החיסכון וההשקעות בחודש',
    ],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 24 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
    { wch: 14 },
    { wch: 44 },
  ];
  wsSummary['!views'] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'סיכום חודשי');

  // --- Sheet 2: יומן תנועות ---
  const sortedTxs = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date));
  const txRows: unknown[][] = [
    ['יומן תנועות שוטף — תיעוד הכנסות והוצאות (רום וסתיו)'],
    [],
    ['תאריך', 'סוג תנועה', 'קטגוריה', 'פירוט / בית עסק', 'סכום (₪)', 'אמצעי תשלום', 'תועד ע"י', 'תקופה'],
    ...sortedTxs.map((t) => [
      formatShortDate(t.date),
      t.type,
      t.category,
      t.description,
      t.amount,
      t.paymentMethod,
      t.loggedBy,
      t.date.slice(0, 7),
    ]),
  ];
  const wsTx = XLSX.utils.aoa_to_sheet(txRows);
  wsTx['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 26 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
  ];
  wsTx['!views'] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(wb, wsTx, 'יומן תנועות');

  // --- Sheet 3: פירוט הוצאות קבועות ---
  const romItems = data.fixedExpenses.filter((f) => f.owner === 'rom');
  const stavItems = data.fixedExpenses.filter((f) => f.owner === 'stav');
  const fixedRows: unknown[][] = [
    ['פירוט הוצאות קבועות והתחייבויות חודשיות — רום וסתיו'],
    [],
    ['סעיף הוצאה קבועה — רום', 'תקציב מתוכנן (₪)', 'שולם בפועל (₪)', 'הפרש (₪)', 'אמצעי תשלום', 'יום חיוב בחודש', 'פירוט והערות'],
    ...romItems.map((i) => [
      i.name,
      i.planned,
      i.paid,
      i.planned - i.paid,
      i.paymentMethod,
      i.billingDay,
      i.notes,
    ]),
    [
      'סה"כ הוצאות קבועות רום',
      summary.fixedRomPlanned,
      summary.fixedRomPaid,
      summary.fixedRomPlanned - summary.fixedRomPaid,
      '',
      '',
      'מועבר אוטומטית לשורת הוצאות קבועות רום בסיכום החודשי',
    ],
    [],
    ['סעיף הוצאה קבועה — סתיו', 'תקציב מתוכנן (₪)', 'שולם בפועל (₪)', 'הפרש (₪)', 'אמצעי תשלום', 'יום חיוב בחודש', 'פירוט והערות'],
    ...stavItems.map((i) => [
      i.name,
      i.planned,
      i.paid,
      i.planned - i.paid,
      i.paymentMethod,
      i.billingDay,
      i.notes,
    ]),
    [
      'סה"כ הוצאות קבועות סתיו',
      summary.fixedStavPlanned,
      summary.fixedStavPaid,
      summary.fixedStavPlanned - summary.fixedStavPaid,
      '',
      '',
      'מועבר אוטומטית לשורת הוצאות קבועות סתיו בסיכום החודשי',
    ],
  ];
  const wsFixed = XLSX.utils.aoa_to_sheet(fixedRows);
  wsFixed['!cols'] = [
    { wch: 28 },
    { wch: 16 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 14 },
    { wch: 36 },
  ];
  wsFixed['!views'] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(wb, wsFixed, 'פירוט הוצאות קבועות');

  // --- Sheet 4: מעקב שנתי ---
  const annualRows: unknown[][] = [
    [`מעקב הכנסות, הוצאות וחיסכון שנתי — רום וסתיו (${year})`],
    [],
    ['קטגוריה', ...HEBREW_MONTHS, 'סה"כ שנתי', 'ממוצע חודשי'],
    ...INCOME_CATEGORIES.map((c) => {
      const row = annual.incomeCategories.find((r) => r.meta.name === c.name)!;
      return [c.name, ...row.months, row.annualTotal, Math.round(row.monthlyAverage)];
    }),
    ['סה"כ הכנסות', ...annual.months.map((m) => m.income), annual.totalIncome, Math.round(annual.avgIncome)],
    [],
    ...EXPENSE_CATEGORIES.map((c) => {
      const row = annual.expenseCategories.find((r) => r.meta.name === c.name)!;
      return [c.name, ...row.months, row.annualTotal, Math.round(row.monthlyAverage)];
    }),
    ['סה"כ הוצאות וחיסכון', ...annual.months.map((m) => m.expenses), annual.totalExpenses, Math.round(annual.avgExpenses)],
    ['יתרה חודשית פנויה (נטו)', ...annual.months.map((m) => m.net), annual.totalNet, Math.round(annual.avgNet)],
  ];
  const wsAnnual = XLSX.utils.aoa_to_sheet(annualRows);
  wsAnnual['!cols'] = [
    { wch: 24 },
    ...HEBREW_MONTHS.map(() => ({ wch: 11 })),
    { wch: 14 },
    { wch: 14 },
  ];
  wsAnnual['!views'] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(wb, wsAnnual, 'מעקב שנתי');

  XLSX.writeFile(wb, `rom_stav_budget_${monthKey}.xlsx`);
}
