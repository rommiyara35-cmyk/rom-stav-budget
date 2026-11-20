import {
  BudgetData,
  CategoryMeta,
  EXPENSE_CATEGORIES,
  FixedExpenseItem,
  HEBREW_MONTHS,
  INCOME_CATEGORIES,
} from '../types/budget';
import { getMonthKey } from './format';

export interface CategorySummaryRow {
  meta: CategoryMeta;
  target: number;
  actual: number;
  difference: number; // For income: actual - target; For expense: target - actual (remaining)
  ratio: number; // actual / target
}

export interface MonthlySummary {
  monthKey: string;
  incomeRows: CategorySummaryRow[];
  expenseRows: CategorySummaryRow[];
  totalIncomeTarget: number;
  totalIncomeActual: number;
  totalExpenseTarget: number;
  totalExpenseActual: number;
  netBalance: number;
  fixedRomPaid: number;
  fixedRomPlanned: number;
  fixedStavPaid: number;
  fixedStavPlanned: number;
}

export interface AnnualMonthPoint {
  monthIndex0: number;
  monthKey: string;
  monthName: string;
  shortName: string;
  income: number;
  expenses: number;
  net: number;
  byCategory: Record<string, number>;
  hasActivity: boolean;
}

export interface AnnualCategoryRow {
  meta: CategoryMeta;
  months: number[]; // length 12
  annualTotal: number;
  monthlyAverage: number;
}

export interface AnnualSummary {
  year: number;
  months: AnnualMonthPoint[];
  incomeCategories: AnnualCategoryRow[];
  expenseCategories: AnnualCategoryRow[];
  totalIncome: number;
  totalExpenses: number;
  totalNet: number;
  activeMonthCount: number;
  avgIncome: number;
  avgExpenses: number;
  avgNet: number;
}

export function sumFixedByOwner(fixedExpenses: FixedExpenseItem[]) {
  let romPlanned = 0;
  let romPaid = 0;
  let stavPlanned = 0;
  let stavPaid = 0;

  for (const item of fixedExpenses) {
    if (item.owner === 'rom') {
      romPlanned += Number(item.planned) || 0;
      romPaid += Number(item.paid) || 0;
    } else {
      stavPlanned += Number(item.planned) || 0;
      stavPaid += Number(item.paid) || 0;
    }
  }

  return { romPlanned, romPaid, stavPlanned, stavPaid };
}

export function computeMonthlySummary(
  data: BudgetData,
  monthKey: string,
  includeFixedExpenses = true
): MonthlySummary {
  const monthTxs = data.transactions.filter((t) => t.date.startsWith(monthKey));
  const fixed = sumFixedByOwner(data.fixedExpenses);

  const txSums: Record<string, number> = {};
  for (const tx of monthTxs) {
    const key = `${tx.type}::${tx.category}`;
    txSums[key] = (txSums[key] || 0) + (Number(tx.amount) || 0);
  }

  const incomeRows: CategorySummaryRow[] = INCOME_CATEGORIES.map((meta) => {
    const target = Number(data.targets[meta.name] ?? meta.defaultTarget) || 0;
    const actual = txSums[`הכנסה::${meta.name}`] || 0;
    return {
      meta,
      target,
      actual,
      difference: actual - target,
      ratio: target > 0 ? actual / target : 0,
    };
  });

  const expenseRows: CategorySummaryRow[] = EXPENSE_CATEGORIES.map((meta) => {
    const target = Number(data.targets[meta.name] ?? meta.defaultTarget) || 0;
    let actual = txSums[`הוצאה::${meta.name}`] || 0;

    if (includeFixedExpenses) {
      if (meta.name === 'הוצאות קבועות רום') {
        actual += fixed.romPaid;
      } else if (meta.name === 'הוצאות קבועות סתיו') {
        actual += fixed.stavPaid;
      }
    }

    return {
      meta,
      target,
      actual,
      difference: target - actual,
      ratio: target > 0 ? actual / target : actual > 0 ? 1.01 : 0,
    };
  });

  const totalIncomeTarget = incomeRows.reduce((acc, r) => acc + r.target, 0);
  const totalIncomeActual = incomeRows.reduce((acc, r) => acc + r.actual, 0);
  const totalExpenseTarget = expenseRows.reduce((acc, r) => acc + r.target, 0);
  const totalExpenseActual = expenseRows.reduce((acc, r) => acc + r.actual, 0);

  return {
    monthKey,
    incomeRows,
    expenseRows,
    totalIncomeTarget,
    totalIncomeActual,
    totalExpenseTarget,
    totalExpenseActual,
    netBalance: totalIncomeActual - totalExpenseActual,
    fixedRomPaid: fixed.romPaid,
    fixedRomPlanned: fixed.romPlanned,
    fixedStavPaid: fixed.stavPaid,
    fixedStavPlanned: fixed.stavPlanned,
  };
}

export function computeAnnualSummary(data: BudgetData, year: number): AnnualSummary {
  const fixed = sumFixedByOwner(data.fixedExpenses);

  const months: AnnualMonthPoint[] = HEBREW_MONTHS.map((monthName, monthIndex0) => {
    const monthKey = getMonthKey(year, monthIndex0);
    const monthTxs = data.transactions.filter((t) => t.date.startsWith(monthKey));
    const hasActivity = monthTxs.length > 0;
    const byCategory: Record<string, number> = {};

    for (const tx of monthTxs) {
      byCategory[tx.category] = (byCategory[tx.category] || 0) + (Number(tx.amount) || 0);
    }

    // Apply recurring fixed expenses to active months in the annual overview
    if (hasActivity) {
      byCategory['הוצאות קבועות רום'] =
        (byCategory['הוצאות קבועות רום'] || 0) + fixed.romPaid;
      byCategory['הוצאות קבועות סתיו'] =
        (byCategory['הוצאות קבועות סתיו'] || 0) + fixed.stavPaid;
    }

    const income = INCOME_CATEGORIES.reduce(
      (sum, c) => sum + (byCategory[c.name] || 0),
      0
    );
    const expenses = EXPENSE_CATEGORIES.reduce(
      (sum, c) => sum + (byCategory[c.name] || 0),
      0
    );

    return {
      monthIndex0,
      monthKey,
      monthName,
      shortName: monthName.slice(0, 3),
      income,
      expenses,
      net: income - expenses,
      byCategory,
      hasActivity,
    };
  });

  const activeMonthCount = months.filter((m) => m.hasActivity).length;
  const divisor = activeMonthCount > 0 ? activeMonthCount : 1;

  const buildCategoryRows = (categories: CategoryMeta[]): AnnualCategoryRow[] =>
    categories.map((meta) => {
      const vals = months.map((m) => m.byCategory[meta.name] || 0);
      const annualTotal = vals.reduce((s, v) => s + v, 0);
      return {
        meta,
        months: vals,
        annualTotal,
        monthlyAverage: activeMonthCount > 0 ? annualTotal / divisor : 0,
      };
    });

  const totalIncome = months.reduce((s, m) => s + m.income, 0);
  const totalExpenses = months.reduce((s, m) => s + m.expenses, 0);
  const totalNet = totalIncome - totalExpenses;

  return {
    year,
    months,
    incomeCategories: buildCategoryRows(INCOME_CATEGORIES),
    expenseCategories: buildCategoryRows(EXPENSE_CATEGORIES),
    totalIncome,
    totalExpenses,
    totalNet,
    activeMonthCount,
    avgIncome: activeMonthCount > 0 ? totalIncome / divisor : 0,
    avgExpenses: activeMonthCount > 0 ? totalExpenses / divisor : 0,
    avgNet: activeMonthCount > 0 ? totalNet / divisor : 0,
  };
}
